# Budgeting Buddy

Budgeting Buddy is a simple web app that helps you track your income, expenses, and savings goals.

## Features

- Register and login
- Add and view income and expense records
- Set and track savings goals
- View visual charts of your spending
- Currency conversion support
- Mobile-friendly design

## Technologies

- HTML, CSS, JavaScript
- Express
- MongoDB
- Exchange rate API for currency conversion
- Chart.js for spending graphs

## Live Deployment

- Render: `https://budgetingbuddy.onrender.com/`

## Getting Started

1. Clone this repo
2. Run `npm install`
3. Use MongoDB Atlas or another MongoDB connection string
4. Set `MONGODB_URI` and `MONGODB_DB`
5. Run `npm start`
6. Open `http://localhost:3000`

## Environment Variables

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=budgeting-buddy
PORT=3000
SESSION_SECRET=replace-this-with-a-long-random-secret
```

## Notes

- Copy `.env.example` values into your shell environment if needed.
- In local development, a demo account is created automatically on startup:
  `demo@example.com` / `demo123`
- If PowerShell blocks `npm`, run `cmd /c npm.cmd start` instead.
- The app is deployed on Render at `https://budgetingbuddy.onrender.com/`
- If you previously exposed a MongoDB password or URI, rotate it in MongoDB Atlas and update Render environment variables before redeploying.

## License

MIT License
