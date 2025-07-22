import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DocumentAnalysis, ComparisonResult, CrossCheckReport } from '../../types/financial';

interface CrossCheckReportProps {
  analyses: DocumentAnalysis[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onStartOver: () => void;
}

export default function CrossCheckReport({ analyses, onExportPDF, onExportExcel, onStartOver }: CrossCheckReportProps) {
  const report: CrossCheckReport = useMemo(() => {
    // Create cross-document comparisons
    const comparisons: ComparisonResult[] = [];
    const allFields = new Set<string>();
    const allYears = new Set<string>();
    
    // Collect all unique fields and years
    analyses.forEach(analysis => {
      analysis.extractedFigures.forEach(figure => {
        allFields.add(figure.label);
        allYears.add(figure.year);
      });
    });

    // Create comparisons for each field-year combination
    allFields.forEach(field => {
      allYears.forEach(year => {
        const values: { [documentName: string]: number | null } = {};
        let category: 'Income Statement' | 'Balance Sheet' | 'Cash Flow Statement' = 'Income Statement';
        
        analyses.forEach(analysis => {
          const figure = analysis.extractedFigures.find(f => f.label === field && f.year === year);
          values[analysis.fileName] = figure ? figure.value : null;
          if (figure) {
            category = figure.category as 'Income Statement' | 'Balance Sheet' | 'Cash Flow Statement';
          }
        });

        // Only include comparisons where at least 2 documents have values
        const nonNullValues = Object.values(values).filter(v => v !== null);
        if (nonNullValues.length >= 2) {
          const uniqueValues = new Set(nonNullValues);
          const consistent = uniqueValues.size === 1;
          
          comparisons.push({
            year,
            field,
            values,
            consistent,
            category
          });
        }
      });
    });

    // Generate summary
    const totalComparisons = comparisons.length;
    const consistentCount = comparisons.filter(c => c.consistent).length;
    const discrepancyCount = totalComparisons - consistentCount;
    
    const keyDiscrepancies = comparisons
      .filter(c => !c.consistent)
      .slice(0, 5)
      .map(c => {
        const docValues = Object.entries(c.values)
          .filter(([, value]) => value !== null)
          .map(([doc, value]) => `${doc}: $${value?.toLocaleString()}`)
          .join(', ');
        return `${c.field} for ${c.year} differs (${docValues})`;
      });

    const consistentSections = Array.from(new Set(
      comparisons
        .filter(c => c.consistent)
        .map(c => c.category)
    ));

    return {
      documentAnalyses: analyses,
      comparisons,
      summary: {
        totalComparisons,
        consistentCount,
        discrepancyCount,
        keyDiscrepancies,
        consistentSections
      }
    };
  }, [analyses]);

  const groupedComparisons = useMemo(() => {
    const groups: { [key: string]: ComparisonResult[] } = {
      'Income Statement': [],
      'Balance Sheet': [],
      'Cash Flow Statement': []
    };
    
    report.comparisons.forEach(comparison => {
      groups[comparison.category].push(comparison);
    });
    
    return groups;
  }, [report.comparisons]);

  const formatValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  const getConsistencyIcon = (consistent: boolean) => {
    return consistent ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getConsistencyText = (consistent: boolean) => {
    return consistent ? '✅ Yes' : '❌ No';
  };

  if (analyses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
        <p className="text-gray-600">Please upload and analyze documents first.</p>
      </Card>
    );
  }

  const hasAnyFinancialData = analyses.some(a => a.extractedFigures.length > 0);

  if (!hasAnyFinancialData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete</h2>
          <p className="text-gray-600">No financial figures found in uploaded documents</p>
        </div>

        <Card className="p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-4">No Financial Data Found</h3>
          <div className="text-left max-w-2xl mx-auto space-y-3">
            <p className="text-gray-600">
              The Document Cross-Checker looks for the following financial figures:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Income Statement</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Revenue/Sales</li>
                  <li>• EBITDA</li>
                  <li>• Net Income</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Balance Sheet</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Total Assets</li>
                  <li>• Total Liabilities</li>
                  <li>• Equity</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cash Flow</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Operating Cash Flow</li>
                  <li>• Investing Cash Flow</li>
                  <li>• Financing Cash Flow</li>
                </ul>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              Please ensure your documents contain financial statements with these figures clearly labeled.
            </p>
          </div>
          
          <Button onClick={onStartOver} className="mt-6">
            Upload Different Documents
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cross-Document Analysis Report</h2>
        <p className="text-gray-600">
          Comparison results for {analyses.length} documents
        </p>
      </div>

      {/* Executive Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{report.summary.totalComparisons}</div>
            <div className="text-sm text-gray-600">Total Comparisons</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{report.summary.consistentCount}</div>
            <div className="text-sm text-gray-600">Consistent Values</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{report.summary.discrepancyCount}</div>
            <div className="text-sm text-gray-600">Discrepancies Found</div>
          </div>
        </div>

        <div className="space-y-4">
          {report.summary.discrepancyCount > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Key Discrepancies:</h4>
              <ul className="space-y-1">
                {report.summary.keyDiscrepancies.map((discrepancy, index) => (
                  <li key={index} className="text-sm text-red-600">• {discrepancy}</li>
                ))}
              </ul>
            </div>
          )}

          {report.summary.consistentSections.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Consistent Sections:</h4>
              <div className="flex flex-wrap gap-2">
                {report.summary.consistentSections.map((section, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                    {section}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Detailed Comparison Tables */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Comparison</h3>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onExportPDF} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
            </Button>
            <Button variant="outline" onClick={onExportExcel} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="Income Statement" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="Income Statement">Income Statement</TabsTrigger>
            <TabsTrigger value="Balance Sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="Cash Flow Statement">Cash Flow Statement</TabsTrigger>
          </TabsList>

          {Object.entries(groupedComparisons).map(([category, comparisons]) => (
            <TabsContent key={category} value={category} className="mt-6">
              {comparisons.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Field</TableHead>
                        {analyses.map(analysis => (
                          <TableHead key={analysis.fileName} className="text-center">
                            {analysis.fileName}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Consistent?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisons.map((comparison, index) => (
                        <TableRow key={index} className={!comparison.consistent ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">{comparison.year}</TableCell>
                          <TableCell>{comparison.field}</TableCell>
                          {analyses.map(analysis => (
                            <TableCell key={analysis.fileName} className="text-center">
                              <span className={
                                comparison.values[analysis.fileName] !== null && !comparison.consistent
                                  ? 'font-medium text-red-600'
                                  : ''
                              }>
                                {formatValue(comparison.values[analysis.fileName])}
                              </span>
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {getConsistencyIcon(comparison.consistent)}
                              <span className={comparison.consistent ? 'text-green-600' : 'text-red-600'}>
                                {getConsistencyText(comparison.consistent)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No {category.toLowerCase()} figures found in the uploaded documents.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      <div className="text-center">
        <Button variant="outline" onClick={onStartOver}>
          Analyze New Documents
        </Button>
      </div>
    </div>
  );
}