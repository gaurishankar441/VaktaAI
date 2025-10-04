import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PDFViewerProps {
  documentId: string | null;
  documents: any[];
}

export default function PDFViewer({ documentId, documents }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentDocument = documents.find(doc => doc.id === documentId);

  useEffect(() => {
    if (currentDocument && currentDocument.status === 'ready') {
      // In production, would integrate with PDF.js here
      setTotalPages(currentDocument.pages || 1);
      renderPage(currentPage);
    }
  }, [documentId, currentDocument, currentPage]);

  const renderPage = async (pageNum: number) => {
    // Placeholder for PDF.js integration
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mock PDF rendering - in production would use PDF.js
    canvas.width = 800;
    canvas.height = 1100;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText(`PDF Page ${pageNum}`, 50, 50);
    ctx.fillText(`Document: ${currentDocument?.title || 'Document'}`, 50, 80);
    
    // Mock content
    ctx.font = '14px Arial';
    const lines = [
      'This is a placeholder for PDF content.',
      'In production, PDF.js would render the actual PDF pages.',
      '',
      'The document viewer supports:',
      '• Navigation between pages',
      '• Zoom in/out functionality', 
      '• Download capabilities',
      '• Search within document',
      '',
      `Current page: ${pageNum} of ${totalPages}`,
      `Zoom level: ${zoom}%`
    ];
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 50, 120 + (index * 25));
    });

    // Mock page border
    ctx.strokeStyle = '#dddddd';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageNum = parseInt(e.target.value);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  if (!documentId || !currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <i className="fas fa-file-pdf text-6xl text-muted-foreground mb-4"></i>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Document Selected</h3>
          <p className="text-muted-foreground">Select a document from the sidebar to view it here</p>
        </div>
      </div>
    );
  }

  if (currentDocument.status === 'processing') {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <h3 className="text-lg font-semibold text-foreground mb-2">Processing Document</h3>
          <p className="text-muted-foreground">Please wait while we prepare your document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground" data-testid="document-title">
            {currentDocument.title}
          </h3>
          <span className="text-xs text-muted-foreground">
            Page <span data-testid="current-page">{currentPage}</span> of {totalPages}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            data-testid="button-zoom-out"
          >
            <i className="fas fa-search-minus text-muted-foreground"></i>
          </Button>
          
          <span className="text-sm font-medium text-foreground px-3" data-testid="zoom-level">
            {zoom}%
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            data-testid="button-zoom-in"
          >
            <i className="fas fa-search-plus text-muted-foreground"></i>
          </Button>
          
          <div className="w-px h-6 bg-border mx-2"></div>
          
          <Button variant="outline" size="icon" data-testid="button-download">
            <i className="fas fa-download text-muted-foreground"></i>
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto custom-scrollbar p-8 flex items-center justify-center">
        <div className="bg-white shadow-2xl rounded-lg" style={{ transform: `scale(${zoom / 100})` }}>
          <canvas
            ref={canvasRef}
            className="border border-border rounded-lg"
            data-testid="pdf-canvas"
          />
        </div>
      </div>

      {/* Page Navigation */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          data-testid="button-previous-page"
        >
          <i className="fas fa-chevron-left text-muted-foreground"></i>
        </Button>
        
        <Input
          type="number"
          value={currentPage}
          onChange={handlePageInputChange}
          min={1}
          max={totalPages}
          className="w-16 text-center"
          data-testid="input-page-number"
        />
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          data-testid="button-next-page"
        >
          <i className="fas fa-chevron-right text-muted-foreground"></i>
        </Button>
      </div>
    </div>
  );
}
