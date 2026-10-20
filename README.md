# NRTC Work Order Management System

A full-stack web application designed to manage work orders, repair and maintenance activities, departmental approvals, spare parts, and work order tracking through a centralized system.

## Overview

The NRTC Work Order Management System aims to improve the organization and tracking of repair and maintenance operations. It provides a structured workflow for creating work orders, recording repair details, managing approvals, and monitoring completion status.

The system is designed around departmental coordination, accurate record keeping, and a clear view of work order progress.

## Key Features

- **Work Order Management:** Create, view, update, and track work orders.
- **Automated Work Order Numbers:** Assign sequential identifiers to work orders.
- **Departmental Workflow:** Organize work orders through relevant departments and approval stages.
- **Repair and Maintenance Records:** Record repair details, work performed, and parts used.
- **Spare Parts Management:** Maintain parts information, store codes, descriptions, and prices.
- **Approval Tracking:** Monitor pending approvals and completed stages.
- **Dashboard:** View work order statistics and operational summaries.
- **Search and Filtering:** Find work orders and review their current status.
- **Gate Pass Management:** Support the recording and tracking of authorized material gate passes, where implemented.
- **Reporting and Export:** Support work order reporting and data export, where implemented.
- **Role-Based Access:** Restrict access to system functions according to assigned user roles.

## Technology Stack

The following technologies should be listed only if they are used in the current version of the project.

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js |
| API Framework | Express.js |
| Database | MongoDB |
| Programming Language | JavaScript |
| Version Control | Git and GitHub |

## Work Order Workflow

A typical work order can follow this process, depending on the configured departmental rules:

1. **Work Order Creation:** Enter the work request and equipment details.
2. **Departmental Review:** Forward the request to the relevant department for review.
3. **Approval:** Complete the required authorization stages.
4. **Repair and Maintenance:** Record the repair work and parts used.
5. **Completion:** Update the work order when the work is finished.
6. **Gate Pass:** Record a gate pass when required and supported by the system.

## Project Structure

The exact structure may vary depending on the implementation.

```text
NRTC-Work-Order-Management-System/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
├── server/                 # Express backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   └── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install the following tools before running the application:

- [Node.js](https://nodejs.org/)
- npm, included with Node.js
- [MongoDB](https://www.mongodb.com/) or a configured MongoDB Atlas database
- [Git](https://git-scm.com/)
- A code editor such as Visual Studio Code


### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server` directory.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Add any other environment variables required by your application. Never commit real credentials, passwords, tokens, or database connection strings to GitHub.

### 4. Start the Backend

Run the command supported by your backend configuration. For example:

```bash
npm run dev
```

If your `package.json` does not define a `dev` script, use the actual script provided by your project.

### 5. Install Frontend Dependencies

Open another terminal from the project root:

```bash
cd client
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Open the local URL displayed in your terminal, commonly `http://localhost:5173` for a Vite-based React application.

> These instructions assume a separate React frontend and Express backend. Adjust the commands and configuration to match your actual project.

## Security and Data Protection

- Keep environment variables and credentials out of version control.
- Use appropriate authentication and authorization controls.
- Validate and sanitize incoming data.
- Restrict access to sensitive records.
- Use only authorized, non-confidential sample data in public demonstrations.

## Project Purpose

This project demonstrates the design and development of a work order management application intended to support repair and maintenance operations. It brings work order records, repair information, approval tracking, and reporting into a single application.

## Future Improvements

Potential improvements include:

- More detailed reporting and analytics
- Enhanced audit logs and activity history
- Email or in-app workflow notifications
- Advanced filtering and pagination
- Automated testing and deployment
- Improved accessibility and responsive layouts

Author

Saif Ur Rehman

Computer Science Graduate | Web Development


## Disclaimer

This repository is intended for authorized development and demonstration purposes. It must not contain confidential organizational information, private records, internal credentials, or proprietary material that the author is not authorized to publish.

---

*Built to support structured work order tracking and repair and maintenance workflows.*
