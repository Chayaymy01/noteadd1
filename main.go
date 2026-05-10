package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

var db *sql.DB

// --- ส่วนที่เพิ่ม/ตรวจสอบ: Struct สำหรับข้อมูล ---

type Note struct {
	ID         int    `json:"id"`
	UserID     int    `json:"user_id" binding:"required"`
	Title      string `json:"title" binding:"required"`
	Content    string `json:"content" binding:"required"`
	TemplateID int    `json:"template_id" binding:"required"`
}

// เพิ่ม Struct Template เพื่อรองรับข้อมูลจากตาราง templates
type Template struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

func main() {
	var err error

	connStr := "user=admin password=pass dbname=note_app host=localhost port=5432 sslmode=disable"

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal("DB connect error:", err)
	}

	r := gin.Default()

	// Middleware สำหรับ CORS (ที่คุณทำไว้แล้ว)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "API running",
		})
	})

	// --- ส่วนที่เพิ่ม: Route สำหรับดึงเทมเพลตไปแสดงฝั่งซ้าย ---

	r.GET("/templates", func(c *gin.Context) {
		rows, err := db.Query("SELECT id, name, content FROM templates ORDER BY id ASC")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var templates []Template
		for rows.Next() {
			var t Template
			if err := rows.Scan(&t.ID, &t.Name, &t.Content); err != nil {
				continue
			}
			templates = append(templates, t)
		}
		c.JSON(200, templates)
	})

	// --- ส่วนของ Notes (โค้ดเดิมของคุณ) ---

	r.POST("/notes", func(c *gin.Context) {
		var note Note
		if err := c.ShouldBindJSON(&note); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		query := `
        INSERT INTO notes (user_id, title, content, template_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `
		var id int
		err := db.QueryRow(query, note.UserID, note.Title, note.Content, note.TemplateID).Scan(&id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Note created", "id": id})
	})

	r.GET("/notes", func(c *gin.Context) {
		rows, err := db.Query("SELECT id, user_id, title, content, template_id FROM notes")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var notes []Note
		for rows.Next() {
			var note Note
			err := rows.Scan(&note.ID, &note.UserID, &note.Title, &note.Content, &note.TemplateID)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			notes = append(notes, note)
		}
		c.JSON(200, notes)
	})

	r.DELETE("/notes/:id", func(c *gin.Context) {
		id := c.Param("id")
		query := "DELETE FROM notes WHERE id = $1"
		_, err := db.Exec(query, id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Note deleted"})
	})

	r.PUT("/notes/:id", func(c *gin.Context) {
		id := c.Param("id")
		var note Note
		if err := c.ShouldBindJSON(&note); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		query := `UPDATE notes SET user_id=$1, title=$2, content=$3, template_id=$4 WHERE id=$5`
		_, err := db.Exec(query, note.UserID, note.Title, note.Content, note.TemplateID, id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"message": "Note updated"})
	})

	// รันเซิร์ฟเวอร์ที่ Port 8888
	r.Run(":8888")
}
