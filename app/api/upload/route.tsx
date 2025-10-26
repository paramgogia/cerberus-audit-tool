import { NextResponse } from "next/server";
import lighthouse from "@lighthouse-web3/sdk";

// --- ADDED: Type for the incoming report ---
interface AnalysisReport {
  overallRiskScore: string;
  summary: string;
  // We only need the JSON structure, not every field
}

// --- ADDED: Type for the Lighthouse response ---
interface LighthouseUploadResponse {
  data: {
    Name: string;
    Hash: string;
    Size: string;
  };
}

export async function POST(req: Request) {
  try {
    // 1. Get the analysisResult JSON from the client's request
    const reportJson: AnalysisReport = await req.json();
    
    if (!reportJson) {
      return NextResponse.json({ error: "No report data provided" }, { status: 400 });
    }

    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Lighthouse API key not set in .env.local" }, { status: 500 });
    }
    
    // 2. Convert the JSON report to a string
    const jsonString = JSON.stringify(reportJson, null, 2);

    // 3. Upload the string to Lighthouse
    const response: LighthouseUploadResponse = await lighthouse.uploadText(
      jsonString, 
      apiKey, 
      "Cerberus Audit Report" // Give it a name
    );

    // 4. Get the CID (Lighthouse calls it 'Hash')
    const cid = response.data.Hash;
    if (!cid) {
        throw new Error("Failed to get CID from Lighthouse response.");
    }

    // 5. Return just the CID
    return NextResponse.json({ cid: cid });

  } catch (err: any) {
    console.error("Lighthouse Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// --- MODIFIED: Added types to your GET function ---
interface LighthouseFile {
  cid: string;
  fileName: string;
  fileSizeInBytes: string;
  createdAt: number;
  // ... any other fields you might need
}

export async function GET() {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Lighthouse API key not set" }, { status: 500 });
    }

    const response = await lighthouse.getUploads(apiKey, null);
    
    // --- FIXED: Replaced 'f: any' with the 'LighthouseFile' type ---
    const files = response.data.fileList.map((f: LighthouseFile) => ({
      cid: f.cid,
      fileName: f.fileName,
    }));
    return NextResponse.json(files);

  } catch (err: any) {
    console.error("Error fetching uploads:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}