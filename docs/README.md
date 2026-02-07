# MakerLab Sets Management System

A comprehensive multilingual system for managing educational maker sets, parts inventory, and receipts using PostgreSQL and React.

## Features

- **Multilingual Support**: Estonian, English, Russian, and Finnish
- **Set Management**: Create and manage educational maker sets with parts and instructions
- **Inventory Tracking**: Track parts stock levels with low stock alerts
- **Receipt Management**: Upload and manage purchase receipts
- **Modern UI**: Built with Material-UI and React
- **PostgreSQL Database**: Robust relational database with multilingual support

## Tech Stack

### Backend
- Node.js with Express
- PostgreSQL database
- Multer for file uploads
- Express validation
- CORS and security middleware

### Frontend
- React with TypeScript
- Material-UI (MUI) components
- React Router for navigation
- React Hook Form for forms
- Axios for API calls
- i18next for internationalization

## Database Schema

The system uses a comprehensive PostgreSQL schema with:
- Multilingual support for sets, parts, and instructions
- Receipt tracking with itemized purchases
- Media file management
- Workshop session tracking
- Preparation checklists

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd makerset-receipt-hub-postgres
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb makerset_db
   
   # Copy environment file
   cp server/.env.example server/.env
   
   # Edit server/.env with your database credentials
   
   # Setup database schema and seed data
   npm run db:setup
   ```

4. **Start the application**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev
   
   # Or run separately:
   npm run server  # Backend on port 5000
   npm run client  # Frontend on port 3000
   ```

## Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=makerset_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Sets
- `GET /api/sets` - Get all sets
- `GET /api/sets/:id` - Get set by ID
- `POST /api/sets` - Create new set
- `PUT /api/sets/:id` - Update set
- `DELETE /api/sets/:id` - Delete set

### Parts
- `GET /api/parts` - Get all parts
- `GET /api/parts/:id` - Get part by ID
- `POST /api/parts` - Create new part
- `PUT /api/parts/:id` - Update part
- `DELETE /api/parts/:id` - Delete part
- `GET /api/parts/alerts/low-stock` - Get low stock parts

### Receipts
- `GET /api/receipts` - Get all receipts
- `GET /api/receipts/:id` - Get receipt by ID
- `POST /api/receipts` - Create new receipt
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `POST /api/receipts/:id/image` - Upload receipt image

### Instructions
- `GET /api/instructions/set/:setId` - Get instructions for a set

### Languages
- `GET /api/languages` - Get supported languages

## Usage

### Managing Sets
1. Navigate to the Sets page
2. Click "Add New Set" to create a new set
3. Fill in the set details and translations
4. Add parts and instructions to the set

### Managing Parts
1. Navigate to the Parts page
2. Click "Add New Part" to create a new part
3. Fill in part details and translations
4. Set stock quantities and minimum levels
5. Use the low stock filter to see items needing restocking

### Managing Receipts
1. Navigate to the Receipts page
2. Click "Add New Receipt" to create a new receipt
3. Fill in receipt details and add items
4. Upload receipt images if available
5. Receipts automatically update stock quantities

### Multilingual Support
- Use the language selector in the navigation bar
- All content supports Estonian, English, Russian, and Finnish
- Language preference is saved in browser storage

## Database Views and Functions

The system includes several useful database views:
- `v_set_parts_list` - Complete parts list for sets with costs
- `v_set_costs` - Total cost per set
- `v_low_stock_parts` - Parts with low stock levels
- `v_set_details` - Complete set information
- `v_instructions_multilingual` - Instructions with translations

## Development

### Project Structure
```
makerset-receipt-hub-postgres/
├── server/                 # Backend API
│   ├── database/          # Database schema and migrations
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── middleware/        # Express middleware
│   └── uploads/           # File uploads
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── i18n/          # Internationalization
│   │   └── types/         # TypeScript types
└── docs/                  # Documentation
```

### Adding New Languages
1. Add language to `server/database/seed.sql`
2. Create translation file in `client/src/i18n/locales/`
3. Update language selector in `Navbar.tsx`

### Adding New Features
1. Update database schema if needed
2. Add API routes in `server/routes/`
3. Create React components in `client/src/`
4. Update TypeScript interfaces in `client/src/services/api.ts`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository.
