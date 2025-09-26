# Shadowguard Drop Tracker

A comprehensive web application for tracking Ultima Online Shadowguard encounters, character performance analytics, and item drops across multiple simultaneous parties.

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

## Analytics Mathematics

### Drop Rate Calculations

**Character Drop Rate**:
```
Drop Rate = (Total Drops / Total Runs Participated) × 100
```
- Aggregates across ALL parties (party-agnostic)
- Minimum 1 run required for calculation
- Rounded to 1 decimal place for display

**Item Drop Rate**:
```
Item Drop Rate = (Times Item Dropped / Total Runs Where Item Could Drop) × 100
```
- Calculated per specific Shadowguard item
- Filtered by party when party-specific analysis requested

### Performance Classification Logic

Character performance indicators use tiered thresholds based on statistical analysis:

**Performance Tiers**:
```javascript
if (dropRate >= 50%) → "Excellent" 
if (dropRate >= 30%) → "Good"
if (dropRate >= 15%) → "Average"  
if (dropRate >= 5%) → "Improving"
if (totalRuns >= 10 && dropRate < 5%) → "Struggling"
else → No indicator (insufficient data)
```

**Minimum Data Requirements**:
- Performance indicators only show for characters with 3+ total runs
- "Struggling" classification requires 10+ runs to avoid false negatives
- Characters with insufficient data show no performance indicator

### Activity-Based Sorting Algorithm

Characters are sorted using a three-tier prioritization system:

**Primary Sort**: Most Recent Activity
```javascript
sortValue = new Date(lastParticipationDate || characterCreatedDate)
// Newest activity first (descending)
```

**Secondary Sort**: Drop Rate Performance
```javascript
if (primarySortEqual) {
    sortValue = dropRate // Higher drop rate first (descending)
}
```

**Tertiary Sort**: Alphabetical Name
```javascript
if (primarySortEqual && secondarySortEqual) {
    sortValue = characterName.localeCompare() // A-Z
}
```

### Search Ranking Algorithm

Search results use relevance-based ranking:

**Exact Match Priority**:
```javascript
if (characterName.toLowerCase().startsWith(searchQuery)) {
    priority = 1 // Highest priority
}
else if (characterName.toLowerCase().includes(searchQuery)) {
    priority = 2 // Medium priority  
}
```

**Activity Boost**:
```javascript
// Within same priority tier, recent activity ranks higher
secondarySort = lastActivityDate // Descending
```

### Statistical Aggregations

**Overview Statistics**:
```javascript
// Total runs across all parties
totalRuns = runs.length

// Total drops across all parties  
totalDrops = drops.length

// Overall drop rate across entire system
overallDropRate = (totalDrops / totalRuns) × 100

// Active characters (participated in last 30 days)
activeCharacters = characters.filter(c => 
    daysSinceLastActivity(c) <= 30
).length
```

**Character Statistics** (Party-Agnostic):
```javascript
// Participation count across all parties
totalRunsParticipated = runParticipants
    .filter(rp => rp.character_id === characterId)
    .length

// Drop count across all parties
totalDrops = drops
    .filter(d => d.character_id === characterId)
    .length

// Runs where character received at least one drop
runsWithDrops = drops
    .filter(d => d.character_id === characterId)
    .map(d => d.run_id)
    .filter((value, index, self) => self.indexOf(value) === index)
    .length
```

## File Structure

```
shadowguard-tracker/
├── package.json                       # Node.js dependencies
├── server.js                          # Express server & API routes
├── database/
│   ├── init.js                       # Database queries & initialization
│   └── schema.sql                    # Database schema definition
├── public/
│   ├── index.html                    # Single-page application
│   ├── css/                          # Modular CSS architecture
│   │   ├── main.css                 # Master CSS import file
│   │   ├── base/                    # Foundation styles
│   │   │   ├── variables.css        # CSS custom properties
│   │   │   ├── reset.css           # Reset & utility styles  
│   │   │   └── typography.css      # Typography system
│   │   ├── components/             # UI component styles
│   │   │   ├── buttons.css         # Button variants
│   │   │   ├── forms.css           # Form controls & inputs
│   │   │   ├── cards.css           # Character & run cards
│   │   │   ├── search.css          # Search interface
│   │   │   ├── modals.css          # Modal dialogs
│   │   │   ├── notifications.css   # Toast notifications
│   │   │   └── tabs.css            # Party tabs & navigation
│   │   └── layout/                 # Layout & responsive
│   │       ├── header.css          # Application header
│   │       ├── grid.css            # Grid layouts & containers
│   │       └── responsive.css      # Mobile/tablet styles
│   └── js/                         # JavaScript modules
│       ├── app.js                  # Main application controller
│       ├── api.js                  # API communication layer
│       ├── components/
│       │   ├── characters.js       # Character management
│       │   ├── runs.js             # Multi-party run logging
│       │   ├── analytics.js        # Statistics & reporting
│       │   └── drops.js            # Drop management
│       └── utils/
│           └── helpers.js          # Utility functions
```

## Installation & Setup

### Prerequisites
- Node.js 14+ 
- npm or yarn package manager

### Installation
```bash
# Clone repository
git clone <repository-url>
cd shadowguard-tracker

# Install dependencies  
npm install

# Start development server
npm start
```

### Database Setup
The application automatically initializes the SQLite database on first run:
- Creates `database/shadowguard.db`
- Executes schema from `database/schema.sql`
- Populates initial Shadowguard items

### Configuration
Default configuration in `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
const DB_PATH = './database/shadowguard.db';
```

## API Endpoints

### Characters
- `GET /api/characters` - List all characters
- `POST /api/characters` - Create new character
- `GET /api/characters/search` - Search characters by name
- `GET /api/characters/stats` - Character performance statistics

### Runs  
- `GET /api/runs` - List runs (with optional party filter)
- `POST /api/runs` - Create new run
- `DELETE /api/runs/:id` - Delete run

### Drops
- `POST /api/drops` - Record item drop
- `DELETE /api/drops/:id` - Delete drop record

### Analytics
- `GET /api/analytics/overview` - System overview statistics
- `GET /api/analytics/item-rates` - Item drop rates
- `GET /api/analytics/recent-activity` - Recent run activity

### Items
- `GET /api/shadowguard-items` - List available Shadowguard items

## Usage Guide

### Managing Characters
1. **Adding Characters**: Use the Characters tab to add new characters to your pool
2. **Character Search**: Use the search field to filter characters by name
3. **Performance Tracking**: Character cards show drop rates and performance indicators

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

### Mobile Performance
- **Responsive Breakpoints**: 320px, 480px, 768px, 1200px+
- **Touch Optimization**: 44px minimum touch targets
- **Performance**: <3 second load time on 3G networks
- **Accessibility**: WCAG 2.1 AA compliance for core functions

## Browser Support
- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **JavaScript**: ES6+ features used (no IE support)

## Contributing

### Development Principles
- **Party-Agnostic Analytics**: Character statistics always aggregate across all parties
- **Mobile-First Design**: Responsive design prioritizes mobile experience
- **Modular Architecture**: Components are self-contained and reusable
- **Performance Focused**: Optimized for 200+ character scenarios

### Code Style
- **JavaScript**: ES6+ with async/await pattern
- **CSS**: BEM-inspired class naming with CSS custom properties
- **Database**: Prepared statements for security and performance
- **Error Handling**: Comprehensive error handling with user-friendly messages

## License

[Add your license information here]

## Support

[Add support/contact information here]