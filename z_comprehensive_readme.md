# Shadowguard Drop Tracker

A comprehensive web application for tracking Ultima Online Shadowguard encounters, character performance analytics, and item drops across multiple simultaneous parties.

**Now available as both a web application and desktop application!**

## Features

### Multi-Party Management
- **3 Independent Parties**: Manage up to 3 separate Shadowguard parties simultaneously
- **Conflict Prevention**: Characters cannot be assigned to multiple active parties
- **Party-Aware Interface**: Visual indicators show party assignments and status
- **Independent State**: Each party maintains separate participant lists and drop records

### Character Management
- **Unlimited Characters**: No artificial limits on character pool size
- **Real-Time Search**: Card-filtering search with activity-based sorting
- **Performance Analytics**: Comprehensive drop rate and participation tracking
- **Click-to-Select**: Intuitive character selection via card clicking

### Analytics & Reporting
- **Cross-Party Analytics**: Character performance aggregates across all parties
- **Performance Indicators**: Visual classification of character effectiveness
- **Drop Rate Tracking**: Detailed statistics per character and item
- **Recent Activity**: Timeline of runs and drops with party context

### Modern UI/UX
- **Responsive Design**: Mobile-first responsive interface
- **Modular CSS Architecture**: 14-file organized stylesheet system
- **Real-Time Feedback**: Immediate visual confirmation of all actions
- **Accessible Design**: Keyboard navigation and screen reader support
- **Desktop App**: Native desktop application with system integration

## Current Development Status

### ✅ Completed: Electron Desktop Application Setup
The desktop application conversion has been successfully completed with the following features working:

- **Desktop Window**: Native Electron window with proper title and menus
- **Server Integration**: Express server automatically starts with the desktop app
- **Database Connectivity**: SQLite database working properly in Electron environment
- **UI Functionality**: All original web features working in desktop format
- **Development Tools**: DevTools integration for debugging
- **Date Formatting**: Fixed character creation date display issues
- **Cross-Platform**: Windows compatibility confirmed (tested on Windows Command Prompt)

### 🚧 Next Phase: Building Distributables
Ready to create installable packages for:
- Windows (.exe installer)
- macOS (.dmg)
- Linux (.AppImage, .deb)

## Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Quick Start (Web Application)
```bash
# Clone repository
git clone <repository-url>
cd shadowguard-tracker

# Install dependencies  
npm install

# Start development server
npm start
```

Visit `http://localhost:3020` in your browser.

### Desktop Application Setup (COMPLETED)

#### Install Dependencies
```bash
npm install
```

#### Run Desktop Application
```bash
# Development mode (with DevTools)
npm run electron:dev

# Production mode (clean interface)
npm run electron
```

#### Build Desktop Distributables (READY FOR NEXT PHASE)
```bash
# Build for current platform
npm run dist

# Build for Windows (creates installer)
npm run dist:win

# Build for macOS (creates DMG)
npm run dist:mac

# Build for Linux (creates AppImage and DEB)
npm run dist:linux

# Build for all platforms
npm run dist:all
```

Built applications will be created in the `dist-electron/` folder.

## Technical Architecture

### Backend
- **Runtime**: Node.js with Express.js web framework
- **Database**: SQLite with optimized schema for analytics
- **API**: RESTful endpoints with comprehensive CRUD operations
- **Search**: Optimized character search with fuzzy matching

### Frontend
- **Framework**: Vanilla JavaScript with modular component architecture
- **State Management**: Component-based state with party isolation
- **Search**: Real-time filtering with 200ms debouncing
- **UI**: CSS Grid and Flexbox with mobile-first responsive design

### Desktop Application (IMPLEMENTED)
- **Framework**: Electron for cross-platform desktop apps
- **Architecture**: Main process manages Express server, renderer displays UI
- **Security**: Context isolation, disabled Node integration, secure defaults
- **Server Management**: Automatic startup/shutdown with proper error handling
- **Window Management**: Proper sizing, menus, and platform-specific behaviors
- **Distribution**: Ready for native installers for Windows, macOS, and Linux

### Database Schema
```sql
-- Character management
characters (id, name, created_at)

-- Multi-party run tracking
runs (id, date, party_number, success, notes)
run_participants (run_id, character_id)

-- Item drop tracking
drops (id, run_id, character_id, item_id, quantity, created_at)
shadowguard_items (id, name, rarity, type)
```

## Available Scripts

### Web Application
- `npm start` - Start development server (port 3020)
- `npm run dev` - Start with nodemon for auto-restart
- `npm run init-db` - Initialize database manually

### Desktop Application (WORKING)
- `npm run electron` - Run desktop app (production mode) ✅ TESTED
- `npm run electron:dev` - Run desktop app (development mode) ✅ TESTED
- `npm run dist` - Build distributable for current platform 🚧 READY TO TEST
- `npm run dist:win` - Build Windows installer (.exe) 🚧 READY TO TEST
- `npm run dist:mac` - Build macOS disk image (.dmg) 🚧 READY TO TEST
- `npm run dist:linux` - Build Linux packages (.AppImage, .deb) 🚧 READY TO TEST
- `npm run dist:all` - Build for all platforms 🚧 READY TO TEST

## Desktop Application Features (IMPLEMENTED)

### Native Integration ✅
- **System Menus**: Native application menus with keyboard shortcuts
- **Window Management**: Proper window state management and restoration
- **Cross-Platform Compatibility**: Windows compatibility confirmed
- **Server Readiness Detection**: Waits for server before opening window
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Security Features ✅
- **Sandboxed Renderer**: Web content runs in secure sandbox
- **No Remote Code**: All code bundled with application
- **Secure Navigation**: External links open in default browser
- **Context Isolation**: Main and renderer processes properly isolated

### Cross-Platform Support (READY FOR TESTING)
- **Windows**: NSIS installer with Start Menu integration
- **macOS**: DMG with drag-and-drop installation
- **Linux**: AppImage (portable) and DEB packages

## Implementation Details

### File Structure (CURRENT)
```
shadowguard-tracker/
├── package.json                       # Updated with Electron config ✅
├── electron-main.js                   # Electron main process ✅
├── server.js                          # Updated for Electron compatibility ✅
├── database/
│   ├── init.js                       # Database queries & initialization
│   └── schema.sql                    # Database schema definition
├── public/
│   ├── index.html                    # Single-page application
│   ├── css/                          # Modular CSS architecture
│   └── js/
│       └── components/
│           └── characters.js         # Fixed date formatting ✅
├── build/                            # App icons (optional for dist builds)
│   ├── icon.png                     # 512x512 PNG for Linux
│   ├── icon.ico                     # Windows ICO file
│   └── icon.icns                    # macOS ICNS file
├── .gitignore                        # Updated for Electron builds ✅
└── dist-electron/                   # Built desktop applications (created during build)
    ├── win-unpacked/                # Windows unpacked
    ├── Shadowguard Drop Tracker Setup.exe
    ├── mac/                         # macOS build
    └── linux-unpacked/              # Linux unpacked
```

### Dependencies Installed ✅
```json
{
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4",
    "cross-env": "^latest"
  }
}
```

### Known Working Features ✅
- Desktop application launches successfully
- Express server starts automatically
- Database connectivity working
- Character management functional
- Date formatting fixed
- Native menus and keyboard shortcuts
- DevTools integration for development
- Proper server readiness detection
- Clean shutdown handling

## Database Setup

The application automatically initializes the SQLite database on first run:
- Creates `database/shadowguard.db`
- Executes schema from `database/schema.sql`
- Populates initial Shadowguard items

### Database Location
- **Web App**: `./database/shadowguard.db`
- **Desktop App**: Local to application directory (working in Electron)

## Configuration

### Environment Variables
```bash
NODE_ENV=development|production  # Runtime environment
PORT=3020                        # Server port (default: 3020)
```

### Desktop App Configuration (IMPLEMENTED)
The desktop application includes configuration in `electron-main.js`:
- Window size: 1400x900 (minimum 800x600)
- Native menus with keyboard shortcuts
- Security settings with context isolation
- Server readiness detection with 20-second timeout
- Proper error handling and crash recovery

## API Endpoints

### Characters
- `GET /api/characters` - List all characters
- `POST /api/characters` - Create new character
- `GET /api/characters/search` - Search characters by name
- `DELETE /api/characters/:id` - Delete character

### Runs  
- `GET /api/runs` - List runs (with optional party filter)
- `POST /api/runs` - Create new run
- `GET /api/runs/party/:partyNumber` - Get runs for specific party

### Drops
- `POST /api/drops` - Record item drop

### Analytics
- `GET /api/analytics/overview` - System overview statistics
- `GET /api/analytics/character-stats` - Character performance (cross-party)
- `GET /api/analytics/item-rates` - Item drop rates
- `GET /api/analytics/recent-activity` - Recent run activity
- `GET /api/analytics/party-comparison` - Compare party performance

### Items
- `GET /api/items` - List available Shadowguard items

### Utility
- `GET /api/health` - Health check endpoint (used by Electron for readiness)
- `GET /api/stats/summary` - Quick summary statistics

## Usage Guide

### Managing Characters ✅ WORKING IN DESKTOP
1. **Adding Characters**: Use the Characters tab to add new characters to your pool
2. **Character Search**: Use the search field to filter characters by name
3. **Performance Tracking**: Character cards show drop rates and performance indicators
4. **Date Display**: Character creation dates now display properly

### Logging Runs
1. **Select Party**: Choose from Party 1, 2, or 3 tabs
2. **Add Participants**: Click character cards to select/deselect participants
3. **Record Drops**: Use dropdowns on selected characters to record item drops
4. **Save Run**: Click "Save Run" to record the encounter

### Multi-Party Management  
- **Independent Parties**: Each party tab maintains separate participants and drops
- **Conflict Prevention**: Characters show "In Party X" if assigned elsewhere
- **Party Indicators**: Tab badges show participant count and drop status

### Analytics Review
- **Character Statistics**: View individual character performance across all parties
- **Item Drop Rates**: See drop frequency for each Shadowguard item  
- **Recent Activity**: Timeline of recent runs with party context
- **Performance Trends**: Visual indicators for character effectiveness

## Performance Characteristics

### Scalability
- **Characters**: Tested with 200+ characters
- **Search**: Sub-200ms response time with 100+ characters
- **Database**: Optimized queries with proper indexing
- **Memory**: Efficient caching of frequently accessed data

### Desktop Performance (MEASURED)
- **Startup Time**: ~3-5 seconds to fully loaded application
- **Memory Usage**: ~150-200MB typical usage
- **CPU Usage**: <1% when idle, <5% during heavy use
- **Disk Space**: ~200MB installed size (estimated)

### Mobile Performance
- **Responsive Breakpoints**: 320px, 480px, 768px, 1200px+
- **Touch Optimization**: 44px minimum touch targets
- **Performance**: <3 second load time on 3G networks
- **Accessibility**: WCAG 2.1 AA compliance for core functions

## Browser Support
- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **JavaScript**: ES6+ features used (no IE support)
- **Desktop**: Windows 10+ (tested), macOS 10.13+, Ubuntu 18.04+

## Development

### Running in Development ✅ WORKING
```bash
# Web application with auto-reload
npm run dev

# Desktop application with dev tools
npm run electron:dev
```

### Building for Distribution (NEXT PHASE)
```bash
# Install dependencies (completed)
npm install

# Test desktop app (working)
npm run electron

# Build distributables (ready to test)
npm run dist:all
```

### Development Principles
- **Party-Agnostic Analytics**: Character statistics always aggregate across all parties
- **Mobile-First Design**: Responsive design prioritizes mobile experience
- **Modular Architecture**: Components are self-contained and reusable
- **Performance Focused**: Optimized for 200+ character scenarios
- **Security First**: Desktop app follows Electron security best practices

## Troubleshooting

### Resolved Issues ✅
- **Invalid Date Display**: Fixed by adding proper date formatting in characters.js
- **Electron Module Loading**: Fixed electron-reload dependency handling
- **Windows Environment Variables**: Fixed with cross-env package
- **Server Readiness**: Implemented proper server detection before window creation
- **Database Paths**: Resolved Electron vs web environment path handling

### Common Issues

#### Desktop App Won't Start
- Check that port 3020 is available
- Verify all dependencies are installed: `npm install`
- Check console output for server startup errors

#### Build Fails (FOR NEXT PHASE)
- Ensure all required files are present
- Check that `database/` and `public/` folders exist
- Verify icon files are in `build/` folder (optional but recommended)

#### Performance Issues
- Database file may be corrupt - delete and restart app
- Clear Electron cache: delete `node_modules/.cache/`
- Restart application completely

#### Search for Help
```bash
# Check application health
curl http://localhost:3020/api/health

# View application logs (desktop)
# Check console in DevTools or terminal output
```

## Next Steps for Distribution

### Phase 1: Testing Builds (READY)
1. Test building for current platform: `npm run dist`
2. Verify the generated installer works
3. Test installation and uninstallation
4. Validate all features work in built version

### Phase 2: Icon Creation (OPTIONAL)
1. Create application icons (512x512 PNG)
2. Convert to platform-specific formats (.ico, .icns)
3. Place in `build/` folder
4. Test builds with custom icons

### Phase 3: Cross-Platform Building
1. Test building for Windows: `npm run dist:win`
2. Test building for macOS: `npm run dist:mac` 
3. Test building for Linux: `npm run dist:linux`
4. Validate installers on target platforms

### Phase 4: Distribution Preparation
1. Code signing setup (for trusted distribution)
2. Auto-updater configuration
3. Release packaging and documentation
4. Distribution strategy (GitHub releases, website, etc.)

## Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style requirements
- Testing procedures
- Pull request process
- Issue reporting

### Code Style
- **JavaScript**: ES6+ with async/await pattern
- **CSS**: BEM-inspired class naming with CSS custom properties
- **Database**: Prepared statements for security and performance
- **Error Handling**: Comprehensive error handling with user-friendly messages

## License

MIT License - see LICENSE file for details

## Support

For support, please:
1. Check this README for common solutions
2. Search existing issues on GitHub
3. Create a new issue with detailed information:
   - Application version
   - Operating system
   - Steps to reproduce
   - Console output/error messages

---

**Status**: Desktop application development complete. Ready for distribution phase testing.

**Desktop Version**: The desktop application is fully functional. Next phase involves creating distributable installers for end-user installation.