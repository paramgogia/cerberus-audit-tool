"use client"

import { useState } from "react"
import { ethers } from "ethers" // Using ethers v5 as requested
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Zap, Code2, Upload, Play, Wallet } from "lucide-react"
import Link from "next/link"

// --- ADDED (Fix 1: Tell TypeScript about window.ethereum) ---
declare global {
  interface Window {
    ethereum?: any;
  }
}

// --- ADDED ---
// TODO: 1. Add your Gemini API Key here (or move to .env.local)
const GEMINI_API_KEY = "AIzaSyBcW_ZHlLTyjGtjcBOqjCjQ2RnxH2f-G6k" // <-- YOUR KEY
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

// --- REMOVED ---
// Removed PINATA_JWT_KEY and PINATA_API_URL.
// API keys should NEVER be in client-side code.

// TODO: 2. Add your deployed Sepolia contract address here
const CONTRACT_ADDRESS = "0x504f044C896fE10fc2a8E36E02F56f878B2F69AD"
// --- ADDED --- (Pasted from your prompt)
const ABI = [
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"codeHash","type":"bytes32"},{"indexed":true,"internalType":"address","name":"auditor","type":"address"},{"indexed":false,"internalType":"string","name":"reportHash","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"AuditRegistered","type":"event"},
  {"inputs":[{"internalType":"bytes32","name":"_codeHash","type":"bytes32"},{"internalType":"string","name":"_reportHash","type":"string"}],"name":"registerAudit","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allAuditHashes","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"auditRecords","outputs":[{"internalType":"string","name":"reportHash","type":"string"},{"internalType":"address","name":"auditor","type":"address"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"auditsByAuditor","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"_codeHash","type":"bytes32"}],"name":"getAudit","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getAuditCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_auditor","type":"address"}],"name":"getAuditHashesByAuditor","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_page","type":"uint256"},{"internalType":"uint256","name":"_limit","type":"uint256"}],"name":"getPaginatedAuditHashes","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"}
]

// --- ADDED ---
// The powerful system prompt for the Gemini API
const geminiSystemPrompt = `You are "Cerberus," a world-class smart contract auditor with expertise from top firms like OpenZeppelin, Trail of Bits, and ConsenSys. You are a precise, technical, and paranoid security expert. Your sole purpose is to analyze a provided Solidity smart contract for vulnerabilities and improvements.

NEVER respond with conversational text. You MUST respond with only a single, valid JSON object.

Analyze the provided Solidity code. Your analysis MUST cover these three categories:
1.  **vulnerabilities**: Check for the OWASP Top 10, including Re-entrancy, Integer Overflow/Underflow, Unchecked External Calls, Access Control issues, Front-Running, etc.
2.  **gasOptimizations**: Look for gas-saving improvements like using calldata, packing variables, using immutable, loop efficiencies.
3.  **bestPractices**: Check for proper modifiers, event emissions, and the Checks-Effects-Interactions pattern.

JSON Output Schema:
{
  "overallRiskScore": "High" | "Medium" | "Low" | "None",
  "summary": "A 1-2 sentence high-level summary of your findings.",
  "vulnerabilities": [
    {
      "line": 42,
      "severity": "High" | "Medium" | "Low",
      "type": "Re-entrancy",
      "details": "The 'withdraw' function performs an external call before updating the user's balance.",
      "recommendation": "Follow the Checks-Effects-Interactions pattern. Update the state variable before the external call."
    }
  ],
  "gasOptimizations": [
    {
      "line": 15,
      "recommendation": "The function argument 'data' is read-only and should be declared as 'calldata' instead of 'memory'."
    }
  ],
  "bestPractices": [
    {
      "line": 55,
      "recommendation": "The 'transferTokens' function modifies a critical state but does not emit an Event. Consider emitting a 'Transfer' event."
    }
  ]
}

If no issues are found in a category, return an empty array [] for that category.`

// --- ADDED (Fix 2 & 3: Define types for the API response) ---
type RiskScore = "High" | "Medium" | "Low" | "None";
type Severity = "High" | "Medium" | "Low";

interface Vulnerability {
  line: number;
  severity: Severity;
  type: string;
  details: string;
  recommendation: string;
}

interface GasOptimization {
  line: number;
  recommendation: string;
}

interface BestPractice {
  line: number;
  recommendation: string;
}
interface AnalysisResult {
  overallRiskScore: RiskScore;
  summary: string;
  vulnerabilities: Vulnerability[];
  gasOptimizations: GasOptimization[];
  bestPractices: BestPractice[];
}

// --- ADDED (Fix 3: Define props for ReportTabs) ---
interface ReportTabsProps {
  result: AnalysisResult | null;
}


export default function Dashboard() {
  const [code, setCode] = useState("// Paste your Solidity code here to be analyzed by Cerberus...")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  
  // --- MODIFIED (Fix 2: Type the state) ---
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  
  const [isAttesting, setIsAttesting] = useState(false)
  const [status, setStatus] = useState("Ready")


  // --- MODIFIED ---
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisComplete(false)
    setAnalysisResult(null)
    setStatus("Analyzing... Cerberus is sniffing for vulnerabilities.")
    
    

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // System instruction to set the context for the model
          "system_instruction": {
            "parts": [
              { "text": geminiSystemPrompt }
            ]
          },
          "contents": [
            {
              "parts": [
                { "text": "Analyze this Solidity code: \n\n```solidity\n" + code + "\n```" }
              ]
            }
          ],
          // Ensure JSON output
          "generationConfig": {
            "responseMimeType": "application/json",
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error?.message || `Google API request failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.candidates || !data.candidates[0].content.parts[0].text) {
        throw new Error("Invalid response structure from Gemini API.")
      }
      // The JSON response from Gemini is in `candidates[0].content.parts[0].text`
      const jsonResponseText = data.candidates[0].content.parts[0].text
      const parsedResult: AnalysisResult = JSON.parse(jsonResponseText)

      setAnalysisResult(parsedResult)
      setAnalysisComplete(true)
      setStatus("Analysis complete. Review the report.")

    } catch (error) {
      console.error("Gemini API Error:", error)
      let message = "Unknown error";
      if (error instanceof Error) message = error.message;
      setStatus(`Error: ${message}. Check API key and console.`)
      setAnalysisComplete(false)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // --- MODIFIED (Swapped Pinata for Lighthouse API route) ---
  const handleAttestation = async () => {
    if (!analysisResult) {
      setStatus("Error: No analysis result to attest.")
      return
    }
    if (!window.ethereum) {
      setStatus("Error: MetaMask not found. Please install it.")
      return
    }
    
    setIsAttesting(true)
    setStatus("Preparing attestation...")

    try {
      // 1. --- (NEW) Upload Report via our Lighthouse API Route ---
      setStatus("Uploading report to IPFS via Lighthouse...")
      
      const response = await fetch('/api/upload', { // Calls our new API route
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisResult), // Send the report as the body
      });

      const data = await response.json();

      if (!response.ok) {
        // 'data.error' is the error message from our API route
        throw new Error(data.error || 'Failed to pin report to IPFS.');
      }

      const reportHash = data.cid; // Get the CID from our API route's response
      
      if (!reportHash) {
        throw new Error("Could not get IPFS hash from API response.");
      }

      setStatus(`Report pinned to IPFS! CID: ${reportHash.substring(0, 10)}...`);

      // 2. Connect to MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = provider.getSigner()

      // 3. Create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)

      // 4. Calculate Code Hash --- (THIS IS THE TYPO FIX) ---
      const codeHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(code))
      
      // 5. Send the transaction (with the REAL Lighthouse CID)
      setStatus("Connecting to wallet... Please confirm the transaction.")
      const tx = await contract.registerAudit(codeHash, reportHash)
      
      setStatus("Transaction sent... waiting for confirmation.")
      
      await tx.wait() // Wait for 1 confirmation
      
      setStatus("Attestation complete! Audit registered on-chain.")

    } catch (error: any) {
      console.error("Attestation Error:", error)
      setStatus(error.reason || error.message || "Attestation failed.")
    } finally {
      setIsAttesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        {/* ... (Your header code is perfect, no changes) ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Cerberus</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-foreground font-medium">
              Auditor
            </Link>
            <Link href="/registry" className="text-muted-foreground hover:text-foreground transition">
              Registry
            </Link>
            <Link href="/auditor/0x1234" className="text-muted-foreground hover:text-foreground transition">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Code Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border bg-card">
              {/* ... (Your CardHeader is perfect) ... */}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  Auditor
                </CardTitle>
                <CardDescription>Paste your Solidity contract code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    readOnly={isAnalyzing || isAttesting}
                    className="w-full h-96 p-4 bg-input border border-border rounded-lg font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    placeholder="// Paste your Solidity code here..."
                  />
                  <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 flex-1"
                      disabled={isAnalyzing || isAttesting}
                      >
                      <Upload className="w-4 h-4" />
                      Load File
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || isAttesting || code.length < 50}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 flex-1"
                    >
                      <Play className="w-4 h-4" />
                      {isAnalyzing ? "Analyzing..." : "Analyze Contract"}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Status: <span className="text-primary font-medium">{status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Report */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card h-full">
              <CardHeader>
                <CardTitle>Report</CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisComplete || !analysisResult ? ( // Modified check
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Code2 className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      {isAnalyzing ? "Cerberus is analyzing your code..." : "Your audit report will appear here. Paste your code and click 'Analyze' to let Cerberus guard your gates."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* // --- MODIFIED --- (Dynamically show risk) */}
                    <div className={`p-4 rounded-lg ${
                      analysisResult.overallRiskScore === "High" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                      analysisResult.overallRiskScore === "Medium" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                      "bg-green-500/10 border-green-500/30 text-green-500"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">RISK: {analysisResult.overallRiskScore.toUpperCase()}</span>
                      </div>
                      <p className="text-sm opacity-80">{analysisResult.summary}</p>
                    </div>
                    
                    {/* // --- MODIFIED --- (Pass result as prop) */}
                    <ReportTabs result={analysisResult} />

                    {/* // --- ADDED --- (Attestation Button) */}
                    <Button
                      onClick={handleAttestation}
                      disabled={isAttesting || isAnalyzing || !analysisResult}
                      className="w-full bg-green-600 hover:bg-green-700 text-primary-foreground gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      {isAttesting ? "Registering on-chain..." : "Create On-Chain Attestation"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// --- MODIFIED (Fix 3: Apply prop types) ---
// --- MODIFIED (Fix 3: Apply prop types) ---
function ReportTabs({ result }: ReportTabsProps) {
  // --- MODIFIED ---
  if (!result) {
    return <div className="text-center text-muted-foreground">Loading report data...</div>
  }

  return (
    <Tabs defaultValue="vulnerabilities" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-input">
        {/* // --- FIXED: Added optional chaining --- */}
        <TabsTrigger value="vulnerabilities" className="text-xs">
          Vulnerabilities ({result.vulnerabilities?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="gas" className="text-xs">
          Gas ({result.gasOptimizations?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="practices" className="text-xs">
          Practices ({result.bestPractices?.length || 0})
        </TabsTrigger>
      </TabsList>

      {/* // --- MODIFIED --- (Dynamic content from props) */}
      <TabsContent value="vulnerabilities" className="space-y-3 mt-4">
        {/* --- FIXED: Used optional chaining (?.) on BOTH .length AND .map --- */}
        {result.vulnerabilities?.length > 0 ? (
          result.vulnerabilities?.map((item: Vulnerability, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-card/50 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    item.severity === "High" ? "destructive" : item.severity === "Medium" ? "secondary" : "outline"
                  }
                >
                  {item.severity}
                </Badge>
                <span className="font-mono text-primary">{item.type}</span>
              </div>
              <div className="text-muted-foreground">Line {item.line}</div>
              <p className="text-foreground">{item.details}</p>
              <p className="text-primary">✓ {item.recommendation}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground text-sm py-4">No vulnerabilities found.</div>
        )}
      </TabsContent>

      <TabsContent value="gas" className="space-y-3 mt-4">
        {/* --- FIXED: Used optional chaining (?.) on BOTH .length AND .map --- */}
        {result.gasOptimizations?.length > 0 ? (
          result.gasOptimizations?.map((item: GasOptimization, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-card/50 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="font-mono">Line {item.line}</span>
              </div>
              <p className="text-foreground">{item.recommendation}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground text-sm py-4">No gas optimizations found.</div>
        )}
      </TabsContent>

      <TabsContent value="practices" className="space-y-3 mt-4">
        {/* --- FIXED: Used optional chaining (?.) on BOTH .length AND .map --- */}
        {result.bestPractices?.length > 0 ? (
          result.bestPractices?.map((item: BestPractice, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-card/50 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-mono">Line {item.line}</span>
              </div>
              <p className="text-foreground">{item.recommendation}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground text-sm py-4">No best practice suggestions.</div>
        )}
      </TabsContent>
    </Tabs>
  )
}