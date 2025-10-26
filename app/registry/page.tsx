"use client"

// --- MODIFIED --- (Added Dialog components)
import { useState, useEffect } from "react"
import { ethers, BigNumber } from "ethers"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge" // <-- Re-added Badge for the modal
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle, // <-- ADDED Icon
  FileText, // <-- ADDED Icon
} from "lucide-react"
import Link from "next/link"

const CONTRACT_ADDRESS = "0x504f044C896fE10fc2a8E36E02F56f878B2F69AD"
const ABI = [
  // ... (ABI remains unchanged)
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

const ITEMS_PER_PAGE = 10

interface AuditRecord {
  hash: string
  reportHash: string
  auditor: string
  timestamp: string
}

// --- ADDED --- (Interface for the IPFS JSON report)
// NOTE: This is an *assumed* structure. You must change this
// to match the actual JSON structure of your AI reports.
interface AuditReport {
  contractName: string
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "Informational"
  summary: string
  vulnerabilities: {
    title: string
    severity: "Critical" | "High" | "Medium" | "Low" | "Informational"
    description: string
    swcId?: string
  }[]
}

export default function Registry() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const [auditsData, setAuditsData] = useState<AuditRecord[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [totalAudits, setTotalAudits] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("Loading on-chain data...")

  // --- ADDED --- (State for the details modal)
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null)
  const [auditDetails, setAuditDetails] = useState<AuditReport | null>(null)
  const [isModalLoading, setIsModalLoading] = useState(false)

  const getContract = () => {
    // ... (This function is unchanged)
    if (!window.ethereum) {
      setStatus("Error: MetaMask not found.")
      return null
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  }

  const fetchPaginatedAudits = async (page: number) => {
    // ... (This function is unchanged)
    const contract = getContract()
    if (!contract) return

    setIsLoading(true)
    setStatus("Fetching audits from the blockchain...")
    
    try {
      const total = await contract.getAuditCount()
      const totalNum = total.toNumber()
      setTotalAudits(totalNum)
      setPageCount(Math.ceil(totalNum / ITEMS_PER_PAGE))

      if (totalNum === 0) {
        setAuditsData([])
        setStatus("No audits found in the registry.")
        setIsLoading(false)
        return
      }

      const hashes = await contract.getPaginatedAuditHashes(page - 1, ITEMS_PER_PAGE)
      const detailsPromises = hashes.map((hash: string) => contract.getAudit(hash))
      const detailsResults = await Promise.all(detailsPromises)

      const combinedData = hashes.map((hash: string, index: number) => {
        const details: [string, string, BigNumber] = detailsResults[index]
        return {
          hash: hash,
          reportHash: details[0],
          auditor: details[1],
          timestamp: new Date(details[2].toNumber() * 1000).toLocaleDateString(),
        }
      })

      setAuditsData(combinedData)
      setStatus(`Displaying ${combinedData.length} of ${totalNum} audits`)

    } catch (error: any) {
      console.error("Error fetching paginated audits:", error)
      setStatus("Error: Could not fetch data from the contract.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    // ... (This function is unchanged)
    const contract = getContract()
    if (!contract || searchQuery.trim() === "") {
      fetchPaginatedAudits(currentPage)
      return
    }

    setIsLoading(true)
    setAuditsData([])
    setStatus(`Searching for "${searchQuery}"...`)

    try {
      let hashes = []
      let searchType = ""

      if (ethers.utils.isAddress(searchQuery)) {
        searchType = "auditor"
        hashes = await contract.getAuditHashesByAuditor(searchQuery)
      } 
      else if (searchQuery.length === 66 && searchQuery.startsWith("0x")) {
        searchType = "hash"
        const details = await contract.getAudit(searchQuery)
        if (details[2].toNumber() > 0) {
          hashes = [searchQuery]
        }
      } 
      else {
        setStatus("Invalid search query. Please enter a valid 0x address or 0x contract hash.")
        setIsLoading(false)
        return
      }

      if (hashes.length === 0) {
        setStatus(`No results found for ${searchType}.`)
        setIsLoading(false)
        return
      }

      const detailsPromises = hashes.map((hash: string) => contract.getAudit(hash))
      const detailsResults = await Promise.all(detailsPromises)
      
      const combinedData = hashes.map((hash: string, index: number) => {
        const details: [string, string, BigNumber] = detailsResults[index]
        return {
          hash: hash,
          reportHash: details[0],
          auditor: details[1],
          timestamp: new Date(details[2].toNumber() * 1000).toLocaleDateString(),
        }
      })

      setAuditsData(combinedData)
      setStatus(`Found ${combinedData.length} result(s)`)
      setPageCount(1)
      setCurrentPage(1)

    } catch (error: any) {
      console.error("Error during search:", error)
      setStatus("Error: Search failed.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- ADDED ---
  // Function to fetch the IPFS JSON report for the modal
  const handleDetailsClick = async (audit: AuditRecord) => {
    setSelectedAudit(audit) // Open the modal
    setIsModalLoading(true)
    setAuditDetails(null)

    try {
      const url = `https://gateway.lighthouse.storage/ipfs/${audit.reportHash}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Network response was not ok")
      }
      const jsonData: AuditReport = await response.json()
      setAuditDetails(jsonData)
    } catch (error) {
      console.error("Failed to fetch audit report:", error)
      // You could set an error state here to show in the modal
    } finally {
      setIsModalLoading(false)
    }
  }

  // --- ADDED ---
  // Helper to map severity to a color for the Badge
  const getBadgeVariant = (
    severity: string | undefined,
  ): "destructive" | "secondary" | "outline" => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      default:
        return "outline"
    }
  }

  useEffect(() => {
    // ... (This function is unchanged)
    if (searchQuery.trim() === "") {
      fetchPaginatedAudits(currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const truncateHash = (hash: string, start = 6, end = 4) => {
    // ... (This function is unchanged)
    return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header (no changes) */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Cerberus</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition">
              Auditor
            </Link>
            <Link href="/registry" className="text-foreground font-medium">
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
        {/* Search Card (no changes) */}
        <Card className="border-border bg-card mb-8">
          <CardHeader>
            <CardTitle>Cerberus Audit Registry</CardTitle>
            <CardDescription>A permanent, on-chain record of all AI-generated audits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Search className="absolute left-7 top-10 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by Contract Hash or Auditor Address..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-input border-border flex-1"
                disabled={isLoading}
              />
                <Button onClick={handleSearch} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Table */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Contract Code Hash
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Auditor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Report</th>
                  {/* --- ADDED --- (New column for details) */}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && auditsData.length > 0 && auditsData.map((audit: AuditRecord, i: number) => (
                  <tr key={i} className="border-b border-border hover:bg-card/50 transition">
                    <td className="px-6 py-4 font-mono text-sm text-primary">{truncateHash(audit.hash)}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{truncateHash(audit.auditor)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{audit.timestamp}</td>
                    <td className="px-6 py-4">
                      {/* Link to IPFS */}
                      <Button asChild variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80">
                        <a 
                          href={`https://gateway.lighthouse.storage/ipfs/${audit.reportHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View Report <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </td>
                    {/* --- ADDED --- (Button to trigger modal) */}
                    <td className="px-6 py-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 bg-transparent"
                        onClick={() => handleDetailsClick(audit)}
                      >
                        <FileText className="w-4 h-4" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Loading and Empty States (no changes) */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">{status}</span>
              </div>
            )}
            {!isLoading && auditsData.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground">{status}</span>
              </div>
            )}
          </div>

          {/* Pagination (no changes) */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card/50">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount > 0 ? pageCount : 1} (Total: {totalAudits})
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1 || isLoading} 
                className="gap-2 bg-transparent"
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 bg-transparent"
                disabled={currentPage === pageCount || pageCount === 0 || isLoading}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </main>

      {/* --- ADDED --- (Audit Details Modal) */}
      {/* --- MODIFIED --- (Audit Details Modal - Corrected for Accessibility) */}
      <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* HEADER IS NOW OUTSIDE OF CONDITIONAL LOGIC */}
          <DialogHeader>
            <DialogTitle>
              {/* Title content is now conditional */}
              {isModalLoading && "Loading Report..."}
              {!isModalLoading && auditDetails && (
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{auditDetails.contractName}</span>
                  <Badge
                    variant={getBadgeVariant(auditDetails.riskLevel)}
                    className="text-sm"
                  >
                    {auditDetails.riskLevel} Risk
                  </Badge>
                </span>
              )}
              {!isModalLoading && !auditDetails && "Error"}
            </DialogTitle>
            <DialogDescription>
              {/* Description content is also conditional */}
              {isModalLoading && "Fetching details from IPFS..."}
              {!isModalLoading && auditDetails && auditDetails.summary}
              {!isModalLoading &&
                !auditDetails &&
                "Could not load the audit report."}
            </DialogDescription>
          </DialogHeader>

          {/* Body content remains conditional */}
          {isModalLoading && (
            <div className="flex items-center justify-center gap-2 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          )}
          {!isModalLoading && auditDetails && (
            <>
              <div className="py-4 space-y-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Vulnerabilities Found ({auditDetails.vulnerabilities.length})
                </h3>
                <div className="space-y-4">
                  {auditDetails.vulnerabilities.length > 0 ? (
                    auditDetails.vulnerabilities.map((vuln, index) => (
                      <div
                        key={index}
                        className="p-4 border border-border rounded-lg bg-card/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            {vuln.title}
                          </h4>
                          <Badge variant={getBadgeVariant(vuln.severity)}>
                            {vuln.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {vuln.description}
                        </p>
                        {vuln.swcId && (
                          <p className="text-xs text-primary mt-2">
                            SWC-ID: {vuln.swcId}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No vulnerabilities were found in this report.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button asChild variant="ghost" className="gap-2">
                  <a
                    href={`https://gateway.lighthouse.storage/ipfs/${selectedAudit?.reportHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Full Report <ExternalLink className="w-4 h-4" />
                  </a>
Button
                </Button>
              </DialogFooter>
            </>
          )}
          {!isModalLoading && !auditDetails && (
            <div className="flex items-center justify-center gap-2 py-20">
              <span className="text-destructive">
                Failed to load report. Please try again or view the raw
                file.
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}