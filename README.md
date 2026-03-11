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

## Getting Started

1. Clone this repo
2. Run `npm install`
3. Start MongoDB locally or use a remote MongoDB connection string
4. Set `MONGODB_URI` if you are not using the default `mongodb://127.0.0.1:27017`
5. Run `npm start`
6. Open `http://localhost:3000`

## Notes

- The server uses `MONGODB_DB=budgeting-buddy` by default.
- Copy `.env.example` values into your shell environment if needed.
- A demo account is created automatically on startup:
  `demo@example.com` / `demo123`
- If PowerShell blocks `npm`, run `cmd /c npm.cmd start` instead.

## License

MIT License
