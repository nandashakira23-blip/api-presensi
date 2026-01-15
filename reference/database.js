const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, 'face_matching.db');

// Singleton database instance
let dbInstance = null;

// Initialize database with singleton pattern
function getDatabase() {
    if (!dbInstance) {
        dbInstance = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                throw err;
            } else {
                console.log('Connected to SQLite database');
                
                // Enable WAL mode for better concurrency
                dbInstance.run('PRAGMA journal_mode = WAL;');
                dbInstance.run('PRAGMA synchronous = NORMAL;');
                dbInstance.run('PRAGMA cache_size = 1000;');
                dbInstance.run('PRAGMA temp_store = MEMORY;');
                
                // Create tables
                dbInstance.serialize(() => {
                    // Reference photos table
                    dbInstance.run(`CREATE TABLE IF NOT EXISTS reference_photos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        filename TEXT NOT NULL,
                        original_name TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        faces_data TEXT NOT NULL,
                        faces_count INTEGER NOT NULL,
                        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )`);
                    
                    // Match history table
                    dbInstance.run(`CREATE TABLE IF NOT EXISTS match_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        reference_id INTEGER,
                        match_filename TEXT,
                        match_file_path TEXT,
                        faces_detected INTEGER,
                        match_results TEXT,
                        match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (reference_id) REFERENCES reference_photos (id)
                    )`);
                    
                    // Real-time sessions table
                    dbInstance.run(`CREATE TABLE IF NOT EXISTS realtime_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        reference_id INTEGER,
                        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
                        session_end DATETIME,
                        total_frames INTEGER DEFAULT 0,
                        total_matches INTEGER DEFAULT 0,
                        match_rate REAL DEFAULT 0,
                        FOREIGN KEY (reference_id) REFERENCES reference_photos (id)
                    )`);
                });
            }
        });
    }
    return dbInstance;
}

// Initialize database
async function initDatabase() {
    return new Promise((resolve, reject) => {
        try {
            const db = getDatabase();
            resolve(db);
        } catch (error) {
            reject(error);
        }
    });
}

// Save reference photo
async function saveReferencePhoto(filename, originalName, filePath, facesData, facesCount) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        // Use serialize to ensure operations are sequential
        db.serialize(() => {
            // First, deactivate all existing reference photos
            db.run('UPDATE reference_photos SET is_active = 0', (err) => {
                if (err) {
                    console.error('Error deactivating old references:', err);
                    reject(err);
                    return;
                }
                
                // Insert new reference photo
                const stmt = db.prepare(`INSERT INTO reference_photos 
                    (filename, original_name, file_path, faces_data, faces_count) 
                    VALUES (?, ?, ?, ?, ?)`);
                
                stmt.run([filename, originalName, filePath, JSON.stringify(facesData), facesCount], function(err) {
                    if (err) {
                        console.error('Error saving reference photo:', err);
                        reject(err);
                    } else {
                        console.log('Reference photo saved to database, ID:', this.lastID);
                        resolve({
                            id: this.lastID,
                            filename,
                            originalName,
                            filePath,
                            facesData,
                            facesCount
                        });
                    }
                    stmt.finalize();
                });
            });
        });
    });
}

// Get active reference photo
async function getActiveReference() {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        db.get('SELECT * FROM reference_photos WHERE is_active = 1 ORDER BY upload_time DESC LIMIT 1', 
            (err, row) => {
                if (err) {
                    console.error('Error getting active reference:', err);
                    reject(err);
                } else if (row) {
                    resolve({
                        id: row.id,
                        filename: row.filename,
                        originalName: row.original_name,
                        filePath: row.file_path,
                        facesData: JSON.parse(row.faces_data),
                        facesCount: row.faces_count,
                        uploadTime: row.upload_time
                    });
                } else {
                    resolve(null);
                }
            });
    });
}

// Save match result
async function saveMatchResult(referenceId, matchFilename, matchFilePath, facesDetected, matchResults) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        const stmt = db.prepare(`INSERT INTO match_history 
            (reference_id, match_filename, match_file_path, faces_detected, match_results) 
            VALUES (?, ?, ?, ?, ?)`);
        
        stmt.run([referenceId, matchFilename, matchFilePath, facesDetected, JSON.stringify(matchResults)], 
            function(err) {
                if (err) {
                    console.error('Error saving match result:', err);
                    reject(err);
                } else {
                    console.log('Match result saved to database, ID:', this.lastID);
                    resolve(this.lastID);
                }
                stmt.finalize();
            });
    });
}

// Delete reference photo
async function deleteReferencePhoto(id) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        // Get file path first
        db.get('SELECT file_path FROM reference_photos WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row && fs.existsSync(row.file_path)) {
                fs.unlinkSync(row.file_path);
            }
            
            // Delete from database
            db.run('DELETE FROM reference_photos WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Error deleting reference photo:', err);
                    reject(err);
                } else {
                    console.log('Reference photo deleted from database');
                    resolve(this.changes);
                }
            });
        });
    });
}

// Delete all reference photos
async function deleteAllReferences() {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        // Get all file paths first
        db.all('SELECT file_path FROM reference_photos', (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Delete files
            rows.forEach(row => {
                if (fs.existsSync(row.file_path)) {
                    fs.unlinkSync(row.file_path);
                }
            });
            
            // Delete from database
            db.run('DELETE FROM reference_photos', function(err) {
                if (err) {
                    console.error('Error deleting all references:', err);
                    reject(err);
                } else {
                    console.log('All reference photos deleted from database');
                    resolve(this.changes);
                }
            });
        });
    });
}

// Get match history
async function getMatchHistory(limit = 10) {
    return new Promise((resolve, reject) => {
        const db = getDatabase();
        
        db.all(`SELECT mh.*, rp.original_name as reference_name 
                FROM match_history mh 
                LEFT JOIN reference_photos rp ON mh.reference_id = rp.id 
                ORDER BY mh.match_time DESC 
                LIMIT ?`, [limit], (err, rows) => {
            if (err) {
                console.error('Error getting match history:', err);
                reject(err);
            } else {
                const history = rows.map(row => ({
                    id: row.id,
                    referenceId: row.reference_id,
                    referenceName: row.reference_name,
                    matchFilename: row.match_filename,
                    facesDetected: row.faces_detected,
                    matchResults: JSON.parse(row.match_results),
                    matchTime: row.match_time
                }));
                resolve(history);
            }
        });
    });
}

module.exports = {
    initDatabase,
    saveReferencePhoto,
    getActiveReference,
    saveMatchResult,
    deleteReferencePhoto,
    deleteAllReferences,
    getMatchHistory
};