# Budgeting Buddy

Budgeting Buddy is a budgeting web app for tracking income, expenses, and savings goals in one workspace. It uses MongoDB for persistence and signed server sessions for authentication.

## Features

- Account registration, login, logout, profile updates, and password changes
- Server-authenticated sessions using signed cookies
- Income tracking with recent entries, expandable full history, and customizable income categories
- Expense tracking with recent entries, expandable full history, budget-month assignment, and money-source selection
- Savings goals with contribution history, budget-month assignment, and money-source selection
- Source-aware balance checks that prevent expenses or savings from using more money than a selected source has left
- Monthly budget balance breakdown for income, expenses, savings, and net balance
- Clickable dashboard budget balance card with a breakdown of remaining money by source
- Currency preference support across the app
- Category management for both expense and income categories, including per-category deletion
- Data export, import, and workspace reset
- Responsive landing page, auth screens, dashboard, savings flow, and settings UI
- Custom app branding with logo and favicon

## Stack

- HTML, CSS, JavaScript
- Express
- MongoDB Node driver
- MongoDB Atlas
- Chart.js
- Render

## Live Deployment

- Render: `https://budgetingbuddy.onrender.com/`

## Local Setup

1. Clone the repo.
2. Run `npm install`.
3. Create a `.env` file or set environment variables in your shell.
4. Set `MONGODB_URI`, `MONGODB_DB`, and `SESSION_SECRET`.
5. Run `npm start` or `npm run dev`.
6. Open `http://localhost:3000`.

## Environment Variables

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?appName=<app-name>
MONGODB_DB=budgeting-buddy
SESSION_SECRET=replace-this-with-a-long-random-secret
PORT=3000
NODE_ENV=development
```

## Production Notes

- Set `NODE_ENV=production` in Render.
- Store `MONGODB_URI`, `MONGODB_DB`, and `SESSION_SECRET` in Render environment variables.
- If you rotate the MongoDB database user password, update `MONGODB_URI` in Render and redeploy.
- If you previously exposed a MongoDB password or URI, rotate it in MongoDB Atlas before continuing to use that cluster.

## Demo Account

- A demo account is created automatically in local development only:
  `demo@example.com` / `demo123`

## Notes

- If PowerShell blocks `npm`, run `cmd /c npm.cmd start`.
- Dashboard, login, register, settings, income, expenses, and savings routes redirect to the `src/html` pages so relative assets resolve correctly.

## License

MIT License
