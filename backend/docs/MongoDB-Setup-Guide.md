# MongoDB Setup Guide for Library Tracker

## Option 1: MongoDB Atlas (Cloud - Recommended for Production)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and create an account
3. Verify your email address

### Step 2: Create a Cluster
1. Choose "Build a Database"
2. Select "Shared" (Free tier)
3. Choose your preferred cloud provider and region
4. Name your cluster (e.g., "library-tracker-cluster")
5. Click "Create Cluster"

### Step 3: Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create username and password (save these securely)
5. Set database user privileges to "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses
5. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Databases" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with "library-tracker"

### Step 6: Update Environment Variables
```bash
# In backend/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/library-tracker?retryWrites=true&w=majority
```

## Option 2: Local MongoDB (Development)

### Step 1: Install MongoDB Community Edition

#### macOS (using Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Windows
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Start MongoDB as a Windows service

#### Ubuntu/Debian
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 2: Verify Installation
```bash
# Check if MongoDB is running
mongosh

# In MongoDB shell
show dbs
use library-tracker
db.test.insertOne({test: "Hello World"})
db.test.find()
```

### Step 3: Environment Configuration
```bash
# In backend/.env
MONGODB_URI=mongodb://localhost:27017/library-tracker
```

## Database Collections Structure

The application will automatically create these collections:

### Users Collection
- Stores user profiles and preferences
- Indexed on: googleId, email, createdAt

### Books Collection
- Stores book information and reading progress
- Indexed on: userId + status, userId + createdAt, userId + text search

## Database Initialization

The application includes automatic database initialization:

1. **Connection**: Automatic connection on server start
2. **Indexes**: Created automatically via Mongoose schemas
3. **Validation**: Built-in schema validation for data integrity

## Testing Database Connection

Run this command to test your database connection:

```bash
cd backend
npm install
npm run dev
```

Look for this message in the console:
```
✅ MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net
```

## Production Considerations

### Security
- Use strong passwords for database users
- Restrict IP access to known addresses
- Enable MongoDB authentication
- Use SSL/TLS connections

### Performance
- Monitor connection pool usage
- Set appropriate timeouts
- Use indexes for frequently queried fields
- Consider read replicas for high-traffic applications

### Backup
- Enable automated backups in MongoDB Atlas
- Set up point-in-time recovery
- Test backup restoration procedures

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check network access settings
   - Verify IP whitelist includes your current IP
   - Check firewall settings

2. **Authentication Failed**
   - Verify username and password
   - Check database user permissions
   - Ensure connection string is correct

3. **Database Not Found**
   - MongoDB creates databases automatically on first write
   - Ensure collection operations are being performed

### Useful Commands

```bash
# Check MongoDB status (local)
sudo systemctl status mongod

# View MongoDB logs (local)
sudo tail -f /var/log/mongodb/mongod.log

# Connect to MongoDB shell
mongosh "mongodb+srv://cluster.mongodb.net/library-tracker" --username <username>

# Export data
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/library-tracker"

# Import data
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/library-tracker" dump/
```

## Next Steps

After setting up MongoDB:
1. Update the `.env` file with your connection string
2. Start the backend server: `npm run dev`
3. Verify the connection in the console logs
4. Test API endpoints with a tool like Postman

For any issues, refer to the [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/) or [MongoDB Community Documentation](https://docs.mongodb.com/).
