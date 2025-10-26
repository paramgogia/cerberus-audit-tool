"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function Registry() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const audits = [
    { hash: "0x1a2b...c3d4", auditor: "0x5e...6f7g", timestamp: "Oct 26, 2025", risk: "HIGH" },
    { hash: "0x4a5b...c6d7", auditor: "0x8h...9i0j", timestamp: "Oct 25, 2025", risk: "LOW" },
    { hash: "0x7c8d...e9f0", auditor: "0x1k...2l3m", timestamp: "Oct 24, 2025", risk: "MEDIUM" },
    { hash: "0x2n3o...p4q5", auditor: "0x6r...7s8t", timestamp: "Oct 23, 2025", risk: "LOW" },
    { hash: "0x9u0v...w1x2", auditor: "0x3y...4z5a", timestamp: "Oct 22, 2025", risk: "HIGH" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by Contract Hash or Auditor Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border"
              />
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Risk Level</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit, i) => (
                  <tr key={i} className="border-b border-border hover:bg-card/50 transition">
                    <td className="px-6 py-4 font-mono text-sm text-primary">{audit.hash}</td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{audit.auditor}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{audit.timestamp}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          audit.risk === "HIGH" ? "destructive" : audit.risk === "MEDIUM" ? "secondary" : "outline"
                        }
                      >
                        {audit.risk}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80">
                        View Report <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card/50">
            <div className="text-sm text-muted-foreground">Page 1 of 10</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className="gap-2 bg-transparent">
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
