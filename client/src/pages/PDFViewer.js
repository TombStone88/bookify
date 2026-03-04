import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function PDFViewer() {

  const query = new URLSearchParams(useLocation().search);

  const file = query.get("file");
  const bookId = query.get("bookId");

  useEffect(() => {

    const updateProgress = async () => {

      try {

        const token = localStorage.getItem("token");

        await axios.put(
          `http://localhost:5000/api/books/progress/${bookId}`,
          { progress: 10 },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

      } catch (error) {

        console.error(error);

      }

    };

    updateProgress();

  }, [bookId]);

  return (

    <div style={{ height: "100vh" }}>

      <iframe
        src={file}
        width="100%"
        height="100%"
        title="PDF Viewer"
      />

    </div>

  );

}

export default PDFViewer;