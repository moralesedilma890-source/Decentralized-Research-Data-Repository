# 📚 Decentralized Research Data Repository

Welcome to a revolutionary platform for storing and sharing research data on the blockchain! This Web3 project addresses real-world problems in academia and science, such as data tampering, lack of proper attribution, centralized control leading to censorship or single points of failure, and inefficient collaboration. By leveraging the Stacks blockchain and Clarity smart contracts, researchers can upload immutable data hashes, ensure fair attribution through transparent ownership tracking, enable peer reviews, and facilitate decentralized access and governance—all while maintaining data integrity and incentivizing contributions.

## ✨ Features

🔒 Immutable storage of research data hashes and metadata  
📝 Fair attribution with verifiable authorship and citation tracking  
🔄 Version control for datasets to handle updates and forks  
🛡️ Access controls and licensing options for data sharing  
👥 Peer review system for validating submissions  
🏆 Token-based incentives for contributors and reviewers  
🗳️ DAO governance for community-driven decisions  
🔍 Queryable index for discovering datasets  
🚫 Prevention of duplicate or plagiarized submissions  
🌐 Interoperability with off-chain storage (e.g., IPFS) for full datasets

## 🛠 How It Works

This project consists of 8 interconnected Clarity smart contracts deployed on the Stacks blockchain. They work together to create a secure, decentralized ecosystem for research data. Data itself is stored off-chain (e.g., on IPFS) for efficiency, while hashes and metadata are anchored on-chain for immutability.

### Core Smart Contracts

1. **UserRegistry.clar**: Manages researcher registrations, profiles, and reputation scores. Users register with their STX address and provide metadata like affiliations.  
2. **DataUpload.clar**: Handles uploading dataset hashes (e.g., SHA-256), titles, descriptions, and initial attributions. Ensures uniqueness by checking existing hashes.  
3. **AttributionTracker.clar**: Tracks authorship, co-authors, and citations. Allows claiming attributions and querying citation graphs for fair credit.  
4. **VersionControl.clar**: Manages dataset versions, forking, and updates. Links new versions to originals while preserving history.  
5. **AccessLicensing.clar**: Sets access permissions (public, restricted) and licenses (e.g., CC-BY). Enforces rules via on-chain checks.  
6. **PeerReview.clar**: Facilitates submission reviews, voting, and feedback. Reviewers stake tokens for integrity, with rewards for approved datasets.  
7. **IncentiveToken.clar**: A fungible token (e.g., ERC-20 equivalent in Clarity) for rewarding uploads, reviews, and citations. Includes staking and distribution logic.  
8. **GovernanceDAO.clar**: Enables token holders to propose and vote on platform upgrades, fee structures, or dispute resolutions.

### For Researchers (Data Uploaders)

- Register your profile via the UserRegistry contract.  
- Generate a hash of your research dataset (e.g., using IPFS for storage).  
- Call the DataUpload contract with:  
  - Dataset hash  
  - Title and description  
  - List of co-authors (STX addresses)  
- Use VersionControl to update datasets if needed, and AttributionTracker to link citations.  
- Set licenses and access via AccessLicensing.  

Your data is now immutably timestamped, attributable, and discoverable!

### For Reviewers and Collaborators

- Stake tokens in PeerReview to participate in reviews.  
- Vote on submissions, providing feedback—successful reviews earn rewards from IncentiveToken.  
- Use AttributionTracker to cite datasets in your own work, automatically notifying original authors.  
- Query datasets via on-chain calls (or off-chain indexers for advanced search).

### For Community Members

- Hold incentive tokens to participate in GovernanceDAO votes.  
- Propose changes, such as adding new features or resolving disputes.  

