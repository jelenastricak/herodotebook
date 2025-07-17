import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Book, Settings, Eye, Palette, Type, Layout } from 'lucide-react';
import * as mammoth from 'mammoth';

const EBookBuilder = () => {
  const [uploadedText, setUploadedText] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [chapters, setChapters] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('kindle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);

  const colorPalette = {
    primary: '#7068af',
    secondary: '#eb90b8',
    accent: '#1edb5e',
    tertiary: '#289e97',
    quaternary: '#97f588',
    background: 'linear-gradient(135deg, #7068af10 0%, #eb90b815 50%, #1edb5e08 100%)',
    surface: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
    text: '#2d2d2d',
    textLight: '#5a5a5a',
    success: '#1edb5e',
    border: '#eb90b8',
    hover: '#289e97'
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Handle .docx files
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setUploadedText(result.value);
      } else if (file.type === 'text/plain') {
        // Handle .txt files
        const text = await file.text();
        setUploadedText(text);
      }
      
      // Auto-organize into chapters
      organizeIntoChapters(uploadedText || file.name);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const organizeIntoChapters = (text) => {
    // Simple chapter detection - look for "Chapter" or numbered sections
    const chapterRegex = /^(Chapter \d+|CHAPTER \d+|\d+\.|Part \d+)/gm;
    const parts = text.split(chapterRegex);
    
    const organizedChapters = [];
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        organizedChapters.push({
          title: parts[i].trim(),
          content: parts[i + 1].trim()
        });
      }
    }
    
    // If no chapters found, create a single chapter
    if (organizedChapters.length === 0) {
      organizedChapters.push({
        title: 'Chapter 1',
        content: text
      });
    }
    
    setChapters(organizedChapters);
  };

  const generateEPUB = (format) => {
    const epubContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${bookTitle}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2025-07-16T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${chapters.map((_, index) => 
      `<item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
  </manifest>
  <spine>
    ${chapters.map((_, index) => 
      `<itemref idref="chapter${index + 1}"/>`
    ).join('\n    ')}
  </spine>
</package>`;

    // Create a blob and download
    const blob = new Blob([epubContent], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle || 'book'}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @page { size: A4; margin: 0.5in; }
        body { font-family: 'Times New Roman', serif; color: ${colorPalette.text}; }
        .title { font-size: 24px; text-align: center; margin-bottom: 20px; color: ${colorPalette.primary}; }
        .author { font-size: 18px; text-align: center; margin-bottom: 30px; color: ${colorPalette.textLight}; }
        .chapter-title { font-size: 18px; font-weight: bold; margin-top: 30px; color: ${colorPalette.primary}; }
        .chapter-content { line-height: 1.6; margin-bottom: 20px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <h1 class="title">${bookTitle}</h1>
    <p class="author">by ${author}</p>
    ${chapters.map(chapter => `
        <div class="page-break">
            <h2 class="chapter-title">${chapter.title}</h2>
            <div class="chapter-content">${chapter.content.replace(/\n/g, '<br>')}</div>
        </div>
    `).join('')}
</body>
</html>`;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle || 'book'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (!bookTitle || !author || chapters.length === 0) {
      alert('Please fill in all fields and upload content before exporting.');
      return;
    }

    switch (selectedFormat) {
      case 'kindle':
      case 'universal':
        generateEPUB(selectedFormat);
        break;
      case 'pdf':
        generatePDF();
        break;
    }
  };

  const formatSpecs = {
    kindle: {
      title: 'Kindle E-Book (.EPUB)',
      description: 'Minimalist cover, 1:1.6 ratio (2500x1600px, 300 DPI). Text-focused with clean typography, high contrast. Dark academia aesthetic.',
      icon: '📱'
    },
    universal: {
      title: 'Universal E-Book (.EPUB)',
      description: 'Same cover as Kindle. Fluid-layout interior, hyperlinked TOC. No fixed formatting. Optimized for all e-readers.',
      icon: '📚'
    },
    pdf: {
      title: 'Premium PDF (Print/Digital)',
      description: 'A4/US Letter (8.5x11in), 0.5in margins, CMYK for print. Print-ready with bleed if needed. Designed for notes/workbook use.',
      icon: '📄'
    }
  };

  if (previewMode) {
    return (
      <div style={{ background: colorPalette.background, minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: colorPalette.surface, borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(112, 104, 175, 0.15), 0 8px 16px rgba(235, 144, 184, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h1 style={{ background: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '32px', fontWeight: '800' }}>Preview</h1>
            <button
              onClick={() => setPreviewMode(false)}
              style={{
                background: `linear-gradient(45deg, ${colorPalette.tertiary}, ${colorPalette.quaternary})`,
                color: 'white',
                border: 'none',
                padding: '14px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 6px 20px rgba(40, 158, 151, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <Settings size={18} />
              Back to Editor
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: `3px solid ${colorPalette.accent}`, paddingBottom: '20px' }}>
            <h1 style={{ background: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '36px', fontWeight: '800', marginBottom: '10px' }}>{bookTitle}</h1>
            <p style={{ color: colorPalette.textLight, fontSize: '20px', fontWeight: '500' }}>by {author}</p>
          </div>

          {chapters.map((chapter, index) => (
            <div key={index} style={{ marginBottom: '30px', padding: '20px', borderRadius: '12px', background: `linear-gradient(135deg, ${colorPalette.quaternary}10, ${colorPalette.secondary}08)`, border: `1px solid ${colorPalette.border}` }}>
              <h2 style={{ color: colorPalette.primary, fontSize: '22px', fontWeight: '700', marginBottom: '15px' }}>{chapter.title}</h2>
              <div style={{ color: colorPalette.text, lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '16px' }}>
                {chapter.content.substring(0, 500)}...
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: colorPalette.background, minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.secondary})`, padding: '12px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(112, 104, 175, 0.3)' }}>
              <Book size={40} color="white" />
            </div>
            <h1 style={{ 
              background: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.secondary}, ${colorPalette.tertiary})`, 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontSize: '42px', 
              fontWeight: '900', 
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>E-Book Builder</h1>
          </div>
          <p style={{ color: colorPalette.textLight, fontSize: '20px', maxWidth: '600px', margin: '0 auto', fontWeight: '500' }}>
            Transform your documents into 
            <span style={{ color: colorPalette.accent, fontWeight: '700' }}> beautiful e-books </span>
            with our intelligent formatting system
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
          {/* Upload Section */}
          <div style={{ background: colorPalette.surface, borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(112, 104, 175, 0.15), 0 8px 16px rgba(235, 144, 184, 0.1)', border: `1px solid ${colorPalette.border}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '30px' }}>
              <div style={{ background: `linear-gradient(45deg, ${colorPalette.secondary}, ${colorPalette.quaternary})`, padding: '8px', borderRadius: '12px' }}>
                <Upload size={24} color="white" />
              </div>
              <h2 style={{ color: colorPalette.primary, fontSize: '24px', fontWeight: '700', margin: 0 }}>Upload Content</h2>
            </div>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `3px dashed ${colorPalette.border}`,
                borderRadius: '16px',
                padding: '50px',
                textAlign: 'center',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${colorPalette.quaternary}10, ${colorPalette.secondary}08)`,
                transition: 'all 0.3s ease',
                marginBottom: '30px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = colorPalette.accent;
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = `0 12px 24px ${colorPalette.accent}30`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = colorPalette.border;
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ background: `linear-gradient(45deg, ${colorPalette.tertiary}, ${colorPalette.accent})`, padding: '16px', borderRadius: '50%', display: 'inline-block', marginBottom: '20px' }}>
                <FileText size={48} color="white" />
              </div>
              <p style={{ color: colorPalette.primary, fontSize: '18px', fontWeight: '600', margin: '0 0 8px' }}>
                {isProcessing ? 'Processing...' : 'Click to upload your document'}
              </p>
              <p style={{ color: colorPalette.textLight, fontSize: '16px', margin: 0 }}>
                Supports .docx and .txt files
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            {uploadedText && (
              <div style={{ 
                background: `linear-gradient(135deg, ${colorPalette.accent}15, ${colorPalette.quaternary}10)`, 
                borderRadius: '12px', 
                padding: '20px', 
                marginBottom: '30px',
                border: `1px solid ${colorPalette.accent}30`
              }}>
                <p style={{ color: colorPalette.accent, fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
                  ✓ Content uploaded successfully
                </p>
                <p style={{ color: colorPalette.textLight, fontSize: '14px', margin: 0 }}>
                  {uploadedText.length} characters • {chapters.length} chapters detected
                </p>
              </div>
            )}

            {/* Book Details */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', color: colorPalette.primary, fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                Book Title
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Enter your book title"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${colorPalette.border}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  background: colorPalette.surface,
                  color: colorPalette.text,
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = colorPalette.accent}
                onBlur={(e) => e.target.style.borderColor = colorPalette.border}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: colorPalette.primary, fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Enter author name"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: `2px solid ${colorPalette.border}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  background: colorPalette.surface,
                  color: colorPalette.text,
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = colorPalette.accent}
                onBlur={(e) => e.target.style.borderColor = colorPalette.border}
              />
            </div>
          </div>

          {/* Format Selection */}
          <div style={{ background: colorPalette.surface, borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(112, 104, 175, 0.15), 0 8px 16px rgba(235, 144, 184, 0.1)', border: `1px solid ${colorPalette.border}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '30px' }}>
              <div style={{ background: `linear-gradient(45deg, ${colorPalette.primary}, ${colorPalette.tertiary})`, padding: '8px', borderRadius: '12px' }}>
                <Layout size={24} color="white" />
              </div>
              <h2 style={{ color: colorPalette.primary, fontSize: '24px', fontWeight: '700', margin: 0 }}>Export Format</h2>
            </div>

            {Object.entries(formatSpecs).map(([key, spec]) => (
              <div
                key={key}
                onClick={() => setSelectedFormat(key)}
                style={{
                  border: `3px solid ${selectedFormat === key ? colorPalette.accent : colorPalette.border}`,
                  borderRadius: '16px',
                  padding: '25px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  background: selectedFormat === key ? 
                    `linear-gradient(135deg, ${colorPalette.accent}15, ${colorPalette.quaternary}10)` : 
                    `linear-gradient(135deg, ${colorPalette.quaternary}05, ${colorPalette.secondary}03)`,
                  transition: 'all 0.3s ease',
                  transform: selectedFormat === key ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: selectedFormat === key ? `0 8px 24px ${colorPalette.accent}30` : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{spec.icon}</span>
                  <h3 style={{ color: colorPalette.primary, fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    {spec.title}
                  </h3>
                </div>
                <p style={{ color: colorPalette.textLight, fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                  {spec.description}
                </p>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
              <button
                onClick={() => setPreviewMode(true)}
                disabled={!bookTitle || !author || chapters.length === 0}
                style={{
                  flex: 1,
                  background: `linear-gradient(45deg, ${colorPalette.hover}, ${colorPalette.tertiary})`,
                  color: 'white',
                  border: 'none',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!bookTitle || !author || chapters.length === 0) ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(40, 158, 151, 0.3)'
                }}
              >
                <Eye size={18} />
                Preview
              </button>
              
              <button
                onClick={handleExport}
                disabled={!bookTitle || !author || chapters.length === 0}
                style={{
                  flex: 1,
                  background: `linear-gradient(45deg, ${colorPalette.secondary}, ${colorPalette.accent})`,
                  color: 'white',
                  border: 'none',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!bookTitle || !author || chapters.length === 0) ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(235, 144, 184, 0.4)'
                }}
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Chapter Organization */}
        {chapters.length > 0 && (
          <div style={{ background: colorPalette.surface, borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(112, 104, 175, 0.15), 0 8px 16px rgba(235, 144, 184, 0.1)', marginTop: '40px', border: `1px solid ${colorPalette.border}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '30px' }}>
              <div style={{ background: `linear-gradient(45deg, ${colorPalette.quaternary}, ${colorPalette.accent})`, padding: '8px', borderRadius: '12px' }}>
                <Type size={24} color="white" />
              </div>
              <h2 style={{ color: colorPalette.primary, fontSize: '24px', fontWeight: '700', margin: 0 }}>Chapter Organization</h2>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {chapters.map((chapter, index) => (
                <div key={index} style={{ 
                  background: `linear-gradient(135deg, ${colorPalette.quaternary}10, ${colorPalette.secondary}08)`, 
                  borderRadius: '12px', 
                  padding: '20px', 
                  border: `1px solid ${colorPalette.border}`,
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${colorPalette.secondary}20`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <h3 style={{ color: colorPalette.primary, fontSize: '18px', fontWeight: '700', margin: '0 0 12px' }}>
                    {chapter.title}
                  </h3>
                  <p style={{ color: colorPalette.textLight, fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                    {chapter.content.substring(0, 150)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div> size={16} />
                Preview
              </button>
              
              <button
                onClick={handleExport}
                disabled={!bookTitle || !author || chapters.length === 0}
                style={{
                  flex: 1,
                  backgroundColor: colorPalette.secondary,
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!bookTitle || !author || chapters.length === 0) ? 0.5 : 1
                }}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Chapter Organization */}
        {chapters.length > 0 && (
          <div style={{ backgroundColor: colorPalette.surface, borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginTop: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Type size={24} color={colorPalette.secondary} />
              <h2 style={{ color: colorPalette.text, fontSize: '20px', fontWeight: '600', margin: 0 }}>Chapter Organization</h2>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              {chapters.map((chapter, index) => (
                <div key={index} style={{ backgroundColor: colorPalette.background, borderRadius: '8px', padding: '15px', border: `1px solid ${colorPalette.border}` }}>
                  <h3 style={{ color: colorPalette.primary, fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
                    {chapter.title}
                  </h3>
                  <p style={{ color: colorPalette.textLight, fontSize: '14px', margin: 0 }}>
                    {chapter.content.substring(0, 150)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EBookBuilder;