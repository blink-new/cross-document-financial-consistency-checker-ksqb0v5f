import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { ExtractedFigure, DocumentAnalysis } from '../../types/financial';
import { blink } from '../../blink/client';

interface AnalysisEngineProps {
  files: File[];
  onAnalysisComplete: (analyses: DocumentAnalysis[]) => void;
}

export default function AnalysisEngine({ files, onAnalysisComplete }: AnalysisEngineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);

  const extractFinancialFigures = useCallback((text: string, fileName: string): ExtractedFigure[] => {
    const figures: ExtractedFigure[] = [];
    
    // Financial patterns with more comprehensive matching
    const patterns = [
      // Revenue patterns
      { category: 'Income Statement', field: 'Revenue', patterns: [/revenue[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /sales[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /total revenue[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Income Statement', field: 'EBITDA', patterns: [/ebitda[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /earnings before[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Income Statement', field: 'Net Income', patterns: [/net income[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /net profit[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /profit after tax[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      
      // Balance Sheet patterns
      { category: 'Balance Sheet', field: 'Total Assets', patterns: [/total assets[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /assets[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Balance Sheet', field: 'Total Liabilities', patterns: [/total liabilities[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /liabilities[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Balance Sheet', field: 'Equity', patterns: [/equity[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /shareholders.? equity[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /stockholders.? equity[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      
      // Cash Flow patterns
      { category: 'Cash Flow Statement', field: 'Operating Cash Flow', patterns: [/operating cash flow[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /cash from operations[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Cash Flow Statement', field: 'Investing Cash Flow', patterns: [/investing cash flow[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /cash from investing[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Cash Flow Statement', field: 'Financing Cash Flow', patterns: [/financing cash flow[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /cash from financing[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] },
      { category: 'Cash Flow Statement', field: 'Net Change in Cash', patterns: [/net change in cash[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi, /net cash flow[:\s]+\$?([\d,]+(?:\.\d{2})?)/gi] }
    ];

    // Year patterns
    const yearPatterns = [/20\d{2}/g];
    const foundYears = new Set<string>();
    
    yearPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(year => foundYears.add(year));
      }
    });

    // If no years found, assume current and previous year
    if (foundYears.size === 0) {
      const currentYear = new Date().getFullYear();
      foundYears.add(currentYear.toString());
      foundYears.add((currentYear - 1).toString());
    }

    // Extract figures for each pattern and year combination
    patterns.forEach(({ category, field, patterns: fieldPatterns }) => {
      fieldPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const valueStr = match[1].replace(/,/g, '');
          const value = parseFloat(valueStr);
          
          if (!isNaN(value) && value > 0) {
            // Try to find the closest year to this match
            const matchIndex = match.index;
            let closestYear = Array.from(foundYears)[0]; // Default to first year found
            let closestDistance = Infinity;
            
            foundYears.forEach(year => {
              const yearIndex = text.indexOf(year, Math.max(0, matchIndex - 200));
              if (yearIndex !== -1) {
                const distance = Math.abs(yearIndex - matchIndex);
                if (distance < closestDistance && distance < 300) { // Within 300 characters
                  closestDistance = distance;
                  closestYear = year;
                }
              }
            });

            // Determine location based on file type
            let location = 'Document content';
            const extension = fileName.toLowerCase().split('.').pop();
            if (extension === 'pdf') {
              location = `PDF page ${Math.floor(matchIndex / 2000) + 1}`;
            } else if (extension === 'xlsx') {
              location = `Excel worksheet`;
            } else if (extension === 'docx') {
              location = `Word document`;
            }

            figures.push({
              category,
              year: closestYear,
              value,
              label: field,
              documentName: fileName,
              location,
              confidence: 0.85 // Base confidence score
            });
          }
        }
      });
    });

    return figures;
  }, []);

  const analyzeDocument = useCallback(async (file: File, index: number): Promise<DocumentAnalysis> => {
    setCurrentStep(index + 1);
    setProgress(((index + 1) / files.length) * 100);

    try {
      console.log(`Analyzing document: ${file.name}`);
      
      // Upload file to storage first
      const { publicUrl } = await blink.storage.upload(file, `analysis/${file.name}`, { upsert: true });
      console.log(`Uploaded ${file.name} to:`, publicUrl);

      // Extract text content
      let extractedText = '';
      try {
        extractedText = await blink.data.extractFromUrl(publicUrl);
        console.log(`Extracted text from ${file.name}:`, extractedText.substring(0, 500) + '...');
      } catch (urlError) {
        console.log(`URL extraction failed for ${file.name}, trying blob extraction:`, urlError);
        try {
          extractedText = await blink.data.extractFromBlob(file);
          console.log(`Blob extraction successful for ${file.name}`);
        } catch (blobError) {
          console.error(`Both extraction methods failed for ${file.name}:`, blobError);
          throw new Error(`Failed to extract content from ${file.name}`);
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(`No text content found in ${file.name}`);
      }

      // Extract financial figures
      const figures = extractFinancialFigures(extractedText, file.name);
      console.log(`Extracted ${figures.length} financial figures from ${file.name}:`, figures);

      return {
        fileName: file.name,
        extractedFigures: figures,
        extractionStatus: figures.length > 0 ? 'success' : 'partial',
        errorMessage: figures.length === 0 ? 'No financial figures found in document' : undefined
      };

    } catch (error) {
      console.error(`Error analyzing ${file.name}:`, error);
      return {
        fileName: file.name,
        extractedFigures: [],
        extractionStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }, [files.length, extractFinancialFigures]);

  const startAnalysis = useCallback(async () => {
    console.log('Starting analysis of', files.length, 'documents');
    setAnalyses([]);
    setCurrentStep(0);
    setProgress(0);

    const results: DocumentAnalysis[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const analysis = await analyzeDocument(files[i], i);
      results.push(analysis);
      setAnalyses(prev => [...prev, analysis]);
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Analysis complete. Results:', results);
    onAnalysisComplete(results);
  }, [files, analyzeDocument, onAnalysisComplete]);

  React.useEffect(() => {
    if (files.length >= 2) {
      startAnalysis();
    }
  }, [files, startAnalysis]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Documents</h2>
        <p className="text-gray-600">
          Extracting financial figures from {files.length} documents...
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Processing Document {currentStep} of {files.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <div className="mt-6 space-y-3">
          {files.map((file, index) => {
            const analysis = analyses.find(a => a.fileName === file.name);
            const isProcessing = currentStep === index + 1;
            const isCompleted = analysis !== undefined;
            
            return (
              <div
                key={file.name}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  ) : isCompleted ? (
                    analysis?.extractionStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  {analysis && (
                    <p className="text-xs text-gray-500">
                      {analysis.extractionStatus === 'success' 
                        ? `${analysis.extractedFigures.length} financial figures extracted`
                        : analysis.extractionStatus === 'partial'
                        ? 'No financial figures found'
                        : `Error: ${analysis.errorMessage}`
                      }
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}