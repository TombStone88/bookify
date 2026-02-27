import React from "react";
import { useLocation } from "react-router-dom";

function PDFViewer() {

  const query = new URLSearchParams(useLocation().search);

  const file = query.get("file");

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