"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function AuditorProfile({ params }: { params: { address: string } }) {
  const [copied, setCopied] = useState(false)

  const audits = [
    { hash: "0x1a2b...c3d4", registered: "Oct 26, 2025", risk: "HIGH" },
    { hash: "0x4a5b...c6d7", registered: "Oct 25, 2025", risk: "LOW" },
    { hash: "0x7c8d...e9f0", registered: "Oct 24, 2025", risk: "MEDIUM" },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(`0x${params.address}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">C</span>
            </div>
            <span className="text-xl font-bold">Cerberus</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition">
              Auditor
            </Link>
            <Link href="/registry" className="text-muted-foreground hover:text-foreground transition">
              Registry
            </Link>
            <Link href={`/auditor/${params.address}`} className="text-foreground font-medium">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/registry">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Registry
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="border-border bg-card mb-8">
          <CardHeader>
            <CardTitle>Auditor Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Address</p>
              <div className="flex items-center gap-2">
                <code className="px-4 py-2 rounded-lg bg-input border border-border font-mono text-sm text-primary flex-1">
                  0x{params.address}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 bg-transparent">
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-2xl font-bold text-primary">{audits.length}</p>
                <p className="text-sm text-muted-foreground">Total Audits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">98%</p>
                <p className="text-sm text-muted-foreground">Accuracy Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">2.3M</p>
                <p className="text-sm text-muted-foreground">Gas Saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audits List */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>All audits submitted by this auditor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audits.map((audit, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-primary">{audit.hash}</p>
                    <p className="text-xs text-muted-foreground">Registered on {audit.registered}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        audit.risk === "HIGH" ? "destructive" : audit.risk === "MEDIUM" ? "secondary" : "outline"
                      }
                    >
                      {audit.risk}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80">
                      View <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
