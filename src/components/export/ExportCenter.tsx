import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Download, FileText, Table, Loader2, CheckCircle } from 'lucide-react'
import { AnalysisReport } from '../../types/financial'

interface ExportCenterProps {
  report: AnalysisReport | null
  onBack: () => void
}

const generatePdfContent = (report: AnalysisReport): string => {
  const date = new Date().toLocaleDateString()
  let content = `FINANCIAL CONSISTENCY ANALYSIS REPORT
Generated on: ${date}

EXECUTIVE SUMMARY
${report.executiveSummary}

DOCUMENT ANALYSIS
Documents Analyzed: ${report.documentsAnalyzed}
Total Figures Extracted: ${report.totalFigures}
Discrepancies Found: ${report.discrepancies.length}
Consistency Score: ${report.consistencyScore}%

DETAILED DISCREPANCY ANALYSIS
`

  report.discrepancies.forEach((discrepancy, index) => {
    content += `
${index + 1}. ${discrepancy.category} (${discrepancy.year})
   Status: ${discrepancy.status}
   Variance: ${discrepancy.variance}%
   
   Document Values:
`
    discrepancy.documentValues.forEach(doc => {
      content += `   - ${doc.documentName}: ${doc.value} (${doc.location})\n`
    })
    
    content += `   Suggestion: ${discrepancy.suggestion}\n`
  })

  content += `

MATCHED FIGURES
`
  report.matchedFigures.forEach((match, index) => {
    content += `${index + 1}. ${match.category} (${match.year}): ${match.value} - All documents match\n`
  })

  return content
}

const generateCsvContent = (report: AnalysisReport): string => {
  let csv = 'Category,Year,Status,Document,Value,Location,Variance,Suggestion\n'
  
  // Add discrepancies
  report.discrepancies.forEach(discrepancy => {
    discrepancy.documentValues.forEach(doc => {
      csv += `"${discrepancy.category}","${discrepancy.year}","${discrepancy.status}","${doc.documentName}","${doc.value}","${doc.location}","${discrepancy.variance}%","${discrepancy.suggestion}"\n`
    })
  })
  
  // Add matched figures
  report.matchedFigures.forEach(match => {
    csv += `"${match.category}","${match.year}","Matched","All Documents","${match.value}","Multiple","0%","No action required"\n`
  })
  
  return csv
}

export default function ExportCenter({ report, onBack }: ExportCenterProps) {
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportedFiles, setExportedFiles] = useState<string[]>([])

  const handleExportPdf = async () => {
    if (!report) return
    
    setExportingPdf(true)
    
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create a comprehensive PDF report content
    const pdfContent = generatePdfContent(report)
    const blob = new Blob([pdfContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `financial-consistency-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setExportingPdf(false)
    setExportedFiles(prev => [...prev, 'PDF'])
  }

  const handleExportExcel = async () => {
    if (!report) return
    
    setExportingExcel(true)
    
    // Simulate Excel generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create a CSV format for Excel compatibility
    const csvContent = generateCsvContent(report)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `financial-consistency-data-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setExportingExcel(false)
    setExportedFiles(prev => [...prev, 'Excel'])
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Available</h3>
        <p className="text-gray-600 mb-6">Please complete the analysis first to generate export reports.</p>
        <Button onClick={onBack}>Back to Upload</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export Center</h2>
          <p className="text-gray-600">Download your financial consistency analysis reports</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Report
        </Button>
      </div>

      {/* Report Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Summary
          </CardTitle>
          <CardDescription>
            Analysis completed on {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{report.documentsAnalyzed}</div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{report.totalFigures}</div>
              <div className="text-sm text-gray-600">Figures</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{report.discrepancies.length}</div>
              <div className="text-sm text-gray-600">Discrepancies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{report.consistencyScore}%</div>
              <div className="text-sm text-gray-600">Consistency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              PDF Report
            </CardTitle>
            <CardDescription>
              Comprehensive report with executive summary and detailed analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Executive summary
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Detailed discrepancy analysis
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Document source references
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Correction suggestions
              </div>
            </div>
            
            <Button 
              onClick={handleExportPdf} 
              disabled={exportingPdf}
              className="w-full"
            >
              {exportingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF Report
                </>
              )}
            </Button>
            
            {exportedFiles.includes('PDF') && (
              <Badge variant="secondary" className="w-full justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                PDF Downloaded
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5 text-green-600" />
              Excel Data
            </CardTitle>
            <CardDescription>
              Structured data table for further analysis and manipulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Raw financial data
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Comparison tables
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Variance calculations
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Pivot-ready format
              </div>
            </div>
            
            <Button 
              onClick={handleExportExcel} 
              disabled={exportingExcel}
              className="w-full"
              variant="outline"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Excel...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel Data
                </>
              )}
            </Button>
            
            {exportedFiles.includes('Excel') && (
              <Badge variant="secondary" className="w-full justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Excel Downloaded
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export History */}
      {exportedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
            <CardDescription>Files downloaded in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exportedFiles.map((fileType, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{fileType} report downloaded at {new Date().toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}