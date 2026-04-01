# Fix for Post Office API Markers and Area Legend Issue

## Problem
The table page was showing "Post office API endpoint not found (404)" error because the JavaScript was calling the wrong API endpoint.

## Root Cause
- JavaScript was calling `/api/postal-offices` (with slash)
- But the actual controller endpoint is `/api/post-offices` (with hyphen)

## Fixes Applied

### 1. Fixed API Endpoints in JavaScript
**File:** `src/main/resources/static/js/table.js`

- Changed `fetch('/api/postal-offices')` to `fetch('/api/post-offices')`
- Changed `fetch('/api/postal-offices/search?q=...')` to `fetch('/api/post-offices/search?q=...')`

### 2. Added Debug Endpoint
**File:** `src/main/java/com/pps/profilesystem/Controller/MapController.java`

Added `/api/post-offices/debug` endpoint to check:
- Total number of offices in database
- Number of non-archived offices
- Offices with coordinates
- Sample office data

### 3. Added Debug Function to JavaScript
**File:** `src/main/resources/static/js/table.js`

Added `debugApiStatus()` function that:
- Calls the debug endpoint after page load
- Logs results to browser console
- Warns if no offices with coordinates are found

### 4. Created Sample Data Script
**File:** `src/main/resources/sample-data.sql`

Contains sample postal offices with:
- Proper coordinates covering different Philippine regions
- Area assignments (1-9)
- Connection status and speed data
- 21 sample offices across all areas

## How to Use

### Step 1: Restart the Application
The Java code changes require a restart to take effect.

### Step 2: Check Browser Console
1. Open the table page
2. Open browser developer tools (F12)
3. Check console for debug information
4. Look for `[Table.js] Debug info:` message

### Step 3: If No Data Exists
If the debug shows no offices in database:

1. **Import Sample Data:**
   ```sql
   -- Run this SQL in your MySQL database
   source src/main/resources/sample-data.sql
   ```

2. **Or Use Import Feature:**
   - Navigate to `/postal-offices/import`
   - Upload an Excel file with postal office data

### Step 4: Verify the Fix
1. The map should now show markers for postal offices
2. Area legend should be populated with data
3. Search functionality should work
4. Filters should work properly

## Expected Results After Fix

### Map Markers
- Colored markers based on area assignment
- Popup with office details when clicked
- Different colors for different areas (Area 1: #FF6B6B, Area 2: #4ECDC4, etc.)

### Area Legend  
- Shows all 9 areas with their respective colors
- System Admin sees all areas
- Area Admin sees only their assigned area

### Search and Filters
- Real-time search suggestions
- Area and status filters work correctly
- Apply/Clear filter buttons functional

## Troubleshooting

### Still Getting 404 Errors
1. Check if application restarted properly
2. Verify the MapController is loaded (check startup logs)
3. Check security configuration allows `/api/post-offices/**`

### No Map Markers Showing
1. Check browser console for debug info
2. Verify database has offices with latitude/longitude
3. Import sample data if needed

### Area Legend Empty
1. Verify offices have area assignments
2. Check if areas table has data
3. Run sample data script if needed

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/post-offices` | GET | Get all postal offices for map |
| `/api/post-offices/search` | GET | Search postal offices |
| `/api/post-offices/debug` | GET | Debug database status |
| `/api/post-offices/all` | GET | Get all offices (for reports) |
| `/api/postal-office/{id}/profile` | GET | Get office profile details |

## Database Tables Required
- `postal_offices` - Main office data
- `areas` - Area definitions  
- `connectivity` - Connection status tracking
- `archived_offices` - Archived office tracking
