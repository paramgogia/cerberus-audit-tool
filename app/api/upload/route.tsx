import { NextResponse } from "next/server";
import lighthouse from "@lighthouse-web3/sdk";

export async function POST(req: Request) {
  try {
    // 1. Get the analysisResult JSON from the client's request
    const reportJson = await req.json();
    
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
    // The 'uploadText' function automatically wraps it in a JSON file for you
    const response = await lighthouse.uploadText(
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

// Including the GET function you provided, in case you need it elsewhere
export async function GET() {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Lighthouse API key not set" }, { status: 500 });
    }

    const response = await lighthouse.getUploads(apiKey, null);
    
    const files = response.data.fileList.map((f: any) => ({
      cid: f.cid,
      fileName: f.fileName,
      size: f.fileSizeInBytes,
      createdAt: f.createdAt,
    }));
    return NextResponse.json(files);

  } catch (err: any) {
    console.error("Error fetching uploads:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}