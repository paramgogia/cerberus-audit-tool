# Cerberus: The AI-Powered Audit Registry


> **Project Vision:** Cerberus uses advanced AI Agents to find smart contract bugs and saves the reports on the blockchain as a permanent, public security record.


---

## 1. The Problem: The Audit Bottleneck

In Web3, "code is law," but that code is often flawed.
* **Slow & Expensive:** Professional smart contract audits are a major bottleneck. They can take weeks and cost tens of thousands of dollars.
* **Developer Blind Spots:** Developers need a "first look" security tool to catch common errors *before* they even commit their code, let alone pay for a formal audit.
* **Lack of Trust:** How do you prove a piece of code was analyzed? How can you track the security "paper trail" of a project in a way that can't be tampered with?

---

## 2. Our Solution: Cerberus

Cerberus is a two-part system that "guards the gates" of Web3 by combining instant AI analysis with an immutable on-chain registry.

1.  **The AI Auditor (AI Agent):** A developer-facing tool that provides an instant, in-depth security analysis of any Solidity contract. It's like having a senior auditor from OpenZeppelin looking over your shoulder.
2.  **The On-Chain Registry (Blockchain):** A "proof-of-audit" system. After analysis, a developer can permanently "attest" to their audit, creating an immutable, timestamped link between their contract's code and its AI-generated security report.

---

## 3. Core Features

### 1. The AI Audit Engine
* **Paste & Analyze:** A simple UI where any developer can paste their Solidity code.
* **Powered by AI Agents:** We use a highly specialized system prompt that instructs our AI Agents to act as a world-class smart contract auditor.
* **Structured JSON Output:** The AI doesn't just return text; it provides a detailed JSON report with categories:
    * `vulnerabilities`: (e.g., Re-entrancy, Integer Overflow)
    * `gasOptimizations`: (e.g., Use `calldata`, cache array lengths)
    * `bestPractices`: (e.g., Emit events, add Natspec)
* **Beautiful UI:** The frontend parses this JSON into a clean, tabbed report, highlighting high-risk issues and providing line-by-line recommendations.

### 2. The On-Chain Attestation
* **Immutable Record:** After reviewing the report, the developer can click "Create On-Chain Attestation."
* **How it Works:**
    1.  The app calculates the `keccak26_ hash of the **Solidity code**.
    2.  The app uploads the **JSON report** to decentralized storage (using **Lighthouse IPFS**), which returns a `reportHash` (CID).
    3.  The app prompts the user's wallet (MetaMask) to call our `AuditRegistry` smart contract.
    4.  The user sends a transaction calling `registerAudit(codeHash, reportHash)`, permanently linking the code to its report on the Sepolia testnet.

### 3. The Registry Explorer
* **A Public "Library of Audits":** A separate "Registry" page that shows *all* audits registered with our smart contract.
* **Read-Only & Decentralized:** This page reads directly from the blockchain using `ethers.js`, showing a table of all attested audits.
* **Searchable:** Users can search by a contract's hash or an auditor's wallet address to find its security history.

---

## 4. Technical Architecture & User Flow

The process is straightforward:
1.  A developer pastes their Solidity code into our React UI.
2.  The frontend sends this code to our **Cerberus AI Agent** for analysis.
3.  The AI Agent returns a structured JSON security report.
4.  The frontend renders this report in a clean, tabbed interface.
5.  The developer reviews the report and clicks "Attest".
6.  The app calculates the code's hash and uploads the JSON report to **Lighthouse IPFS**, receiving a `reportHash` (CID).
7.  The app prompts the user's MetaMask wallet to send a transaction to our `AuditRegistry` contract, calling `registerAudit` with the `codeHash` and `reportHash`.
8.  The transaction is confirmed on the Sepolia blockchain, creating a permanent, public record.
9.  Anyone can now visit our "Registry" page, which reads all records from the smart contract to browse and verify past audits.

---

## 5. Tech Stack

* **Frontend:** React (Next.js), `ethers.js v5`, TailwindCSS
* **AI Backend:** Custom AI Agents
* **Smart Contract:** Solidity
* **Blockchain:** Deployed on Sepolia Testnet
* **Storage:** Lighthouse IPFS for decentralized, permanent report storage.

---

## 6. How We Met the Hackathon Goals

* **"Reduce real-world security risks..."**
    * **We did this:** Our AI auditor directly finds critical vulnerabilities (like re-entrancy and access control flaws) *before* they can be deployed, making developers more secure by default.

* **"Apply blockchain to improve trust, transparency, and verification."**
    * **We did this:** The `AuditRegistry` contract *is* the trust layer. It's a transparent, immutable, and verifiable public ledger. Anyone can query our contract to see if a piece of code has been analyzed and what that analysis said.

* **"Ship a demo that could make the internet a little safer."**
    * **We did this:** We shipped a working dApp with three parts: a functional AI auditor, a deployed smart contract, and a registry explorer that reads live data from the chain.
