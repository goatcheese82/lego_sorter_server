// Static file server for the Lego Sorter web app: serves ./dist (or STATIC_DIR), answers GET /health,
// long-caches the hashed assets and never caches index.html.
package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3008"
	}
	dir := os.Getenv("STATIC_DIR")
	if dir == "" {
		dir = "dist"
	}
	if _, err := os.Stat(dir + "/index.html"); err != nil {
		log.Fatalf("static dir %q has no index.html: %v", dir, err)
	}
	files := http.FileServer(http.Dir(dir))
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable") // Vite hashes these names
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	})
	srv := &http.Server{Addr: ":" + port, Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	log.Printf("lego-sorter serving %s on :%s", dir, port)
	log.Fatal(srv.ListenAndServe())
}
