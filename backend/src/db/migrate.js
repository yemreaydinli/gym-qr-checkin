// Basit migrasyon betiği: schema.sql dosyasını çalıştırır.
// Kullanım: npm run migrate
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    console.log('Şema uygulanıyor...');
    await pool.query(sql);
    console.log('✅ Veritabanı şeması başarıyla oluşturuldu / güncellendi.');
  } catch (err) {
    console.error('❌ Migrasyon hatası:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
