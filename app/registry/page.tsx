"use client"

// --- MODIFIED ---
import { useState, useEffect } from "react"
// --- ADDED ---
import { ethers, BigNumber } from "ethers" // <-- ADDED BigNumber
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// --- MODIFIED --- (Removed Badge, not feasible to get risk level in a list)
import { Search, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"

// --- ADDED ---
// TODO: 1. Add your deployed Sepolia contract address here
const CONTRACT_ADDRESS = "0x504f044C896fE10fc2a8E36E02F56f878B2F69AD"
// --- ADDED ---
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
const ITEMS_PER_PAGE = 10

// --- ADDED --- (Interface for audit data)
interface AuditRecord {
  hash: string;
  reportHash: string;
  auditor: string;
  timestamp: string;
}

export default function Registry() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  // --- MODIFIED --- (States for real data, with type)
  const [auditsData, setAuditsData] = useState<AuditRecord[]>([]) // <-- TYPED
  const [pageCount, setPageCount] = useState(0)
  const [totalAudits, setTotalAudits] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("Loading on-chain data...")

  // --- ADDED ---
  // Re-usable function to get contract instance
  const getContract = () => {
    if (!window.ethereum) {
      setStatus("Error: MetaMask not found.")
      return null
    }
    // Use a public provider or MetaMask's provider for reads
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  }

  // --- ADDED ---
  // Function to fetch paginated audit data
  const fetchPaginatedAudits = async (page: number) => { // <-- TYPED 'page'
    const contract = getContract()
    if (!contract) return

    setIsLoading(true)
    setStatus("Fetching audits from the blockchain...")
    
    try {
      // Get total count for pagination
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

      // Get the hashes for the current page
      // Contract is 0-indexed, UI is 1-indexed
      const hashes = await contract.getPaginatedAuditHashes(page - 1, ITEMS_PER_PAGE)

      // For each hash, get its details
      const detailsPromises = hashes.map((hash: string) => contract.getAudit(hash)) // <-- TYPED 'hash'
      const detailsResults = await Promise.all(detailsPromises)

      // Combine hashes with their details
      const combinedData = hashes.map((hash: string, index: number) => { // <-- TYPED 'hash' and 'index'
        const details: [string, string, BigNumber] = detailsResults[index] // <-- TYPED 'details'
        return {
          hash: hash,
          reportHash: details[0],
          auditor: details[1],
          // Convert BigNumber timestamp (in seconds) to a readable date string
          timestamp: new Date(details[2].toNumber() * 1000).toLocaleDateString(),
        }
      })

      setAuditsData(combinedData)
      setStatus(`Displaying ${combinedData.length} of ${totalNum} audits`)

    } catch (error: any) { // <-- TYPED 'error'
      console.error("Error fetching paginated audits:", error)
      setStatus("Error: Could not fetch data from the contract.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- ADDED ---
  // Function to handle search
  const handleSearch = async () => {
    const contract = getContract()
    if (!contract || searchQuery.trim() === "") {
      // If search is cleared, fetch paginated data
      fetchPaginatedAudits(currentPage)
      return
    }

    setIsLoading(true)
    setAuditsData([])
    setStatus(`Searching for "${searchQuery}"...`)

    try {
      let hashes = []
      let searchType = ""

      // Check if it's an address
      if (ethers.utils.isAddress(searchQuery)) {
        searchType = "auditor"
        hashes = await contract.getAuditHashesByAuditor(searchQuery)
      } 
      // Check if it's a bytes32 hash
      else if (searchQuery.length === 66 && searchQuery.startsWith("0x")) {
        searchType = "hash"
        // Check if this hash exists
        const details = await contract.getAudit(searchQuery)
        if (details[2].toNumber() > 0) { // Check if timestamp is set
          hashes = [searchQuery]
        }
      } 
      // Invalid query
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

      // We found hashes, now get their details (same as pagination)
      const detailsPromises = hashes.map((hash: string) => contract.getAudit(hash)) // <-- TYPED 'hash'
      const detailsResults = await Promise.all(detailsPromises)
      
      const combinedData = hashes.map((hash: string, index: number) => { // <-- TYPED 'hash' and 'index'
        const details: [string, string, BigNumber] = detailsResults[index] // <-- TYPED 'details'
        return {
          hash: hash,
          reportHash: details[0],
          auditor: details[1],
          timestamp: new Date(details[2].toNumber() * 1000).toLocaleDateString(),
        }
      })

      setAuditsData(combinedData)
      setStatus(`Found ${combinedData.length} result(s)`)
      // Disable pagination in search mode
      setPageCount(1)
      setCurrentPage(1)

    } catch (error: any) { // <-- TYPED 'error'
      console.error("Error during search:", error)
      setStatus("Error: Search failed.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- ADDED ---
  // Fetch data on page load and when currentPage changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      fetchPaginatedAudits(currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // --- ADDED ---
  // Helper to truncate hashes
  const truncateHash = (hash: string, start = 6, end = 4) => { // <-- TYPED 'hash'
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
        <Card className="border-border bg-card mb-8">
          <CardHeader>
            <CardTitle>Cerberus Audit Registry</CardTitle>
            <CardDescription>A permanent, on-chain record of all AI-generated audits</CardDescription>
          </CardHeader>
          <CardContent>
            {/* --- MODIFIED --- (Added search button and keyboard event) */}
            <div className="flex gap-2">
              <Search className="absolute left-7 top-10 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by Contract Hash or Auditor Address..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} // <-- TYPED 'e'
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()} // <-- TYPED 'e'
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
                {/* --- MODIFIED --- (Removed Risk Level) */}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Report</th>
                </tr>
              </thead>
              <tbody>
                {/* --- MODIFIED --- (Dynamic rendering from state) */}
                {!isLoading && auditsData.length > 0 && auditsData.map((audit: AuditRecord, i: number) => ( // <-- TYPED 'audit' and 'i'
                  <tr key={i} className="border-b border-border hover:bg-card/50 transition">
                    <td className="px-6 py-4 font-mono text-sm text-primary">{truncateHash(audit.hash)}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{truncateHash(audit.auditor)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{audit.timestamp}</td>
                    <td className="px-6 py-4">
                        {/* --- MODIFIED --- (Link to IPFS) */}
                      <Button asChild variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80">
                          {/* This assumes you are using Pinata or another IPFS gateway.
                              We can't get the JSON content for the 'risk' badge here,
                              but we can link directly to the report.
                            */}
                          <a 
                            href={`https://gateway.pinata.cloud/ipfs/${audit.reportHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                          View Report <ExternalLink className="w-4 h-4" />
                          </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* --- ADDED --- (Loading and Empty States) */}
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

          {/* Pagination --- MODIFIED --- */}
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
    </div>
  )
}