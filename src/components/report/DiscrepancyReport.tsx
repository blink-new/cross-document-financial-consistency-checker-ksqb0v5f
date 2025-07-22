import React from 'react'
import { AlertTriangle, CheckCircle, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import type { AnalysisReport } from '../../types/financial'

interface DiscrepancyReportProps {
  report: AnalysisReport
  onBack: () => void
  onGoToExport: () => void
}

export default function DiscrepancyReport({ report, onBack, onGoToExport }: DiscrepancyReportProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600'
    if (variance < 50000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getVarianceIcon = (variance: number) => {
    if (variance === 0) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (variance < 50000) return <TrendingUp className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  // Get all unique categories and years for the comparison table
  const allCategories = new Set<string>()
  const allYears = new Set<string>()
  
  Object.values(report.extractedFigures).forEach(figures => {
    figures.forEach(figure => {
      allCategories.add(figure.category)
      allYears.add(figure.year)
    })
  })

  const sortedCategories = Array.from(allCategories).sort()
  const sortedYears = Array.from(allYears).sort().reverse()

  // Create comparison data structure
  const comparisonData = sortedCategories.map(category => {
    const categoryData: any = { category }
    
    sortedYears.forEach(year => {
      const figuresForCategoryYear = Object.entries(report.extractedFigures)
        .map(([docName, figures]) => ({
          docName,
          figure: figures.find(f => f.category === category && f.year === year)
        }))
        .filter(item => item.figure)
      
      if (figuresForCategoryYear.length > 0) {
        categoryData[`${year}_data`] = figuresForCategoryYear
        
        // Check if there's a discrepancy
        const values = figuresForCategoryYear.map(item => item.figure!.value)
        const uniqueValues = [...new Set(values)]
        categoryData[`${year}_hasDiscrepancy`] = uniqueValues.length > 1
        categoryData[`${year}_variance`] = uniqueValues.length > 1 ? Math.max(...values) - Math.min(...values) : 0
      }
    })
    
    return categoryData
  })

  if (report.summary.totalFiguresFound === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">No Financial Data Found</h3>
              <p className="text-amber-700 mb-4">
                No financial figures were extracted from the uploaded documents. This could be because:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-600 mb-4">
                <li>The documents don't contain recognizable financial data</li>
                <li>Financial figures are in a format not currently supported</li>
                <li>The text extraction process couldn't access the content</li>
              </ul>
              <div className="space-y-2 text-sm text-amber-600">
                <p><strong>Supported financial categories:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Revenue, Sales figures</li>
                  <li>EBITDA, Earnings data</li>
                  <li>Net Income, Profit figures</li>
                  <li>Total Assets, Liabilities</li>
                  <li>Cash Flow statements</li>
                </ul>
              </div>
              <div className="flex space-x-3 mt-4">
                <Button onClick={onBack} variant="outline">
                  Upload Different Documents
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Cross-Document Analysis Report
        </h2>
        <p className="text-gray-600">
          Financial consistency analysis across {report.documentNames.length} documents
        </p>
      </div>

      {/* Executive Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{report.summary.totalDocuments}</div>
            <div className="text-sm text-gray-600">Documents Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{report.summary.totalFiguresFound}</div>
            <div className="text-sm text-gray-600">Figures Extracted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{report.summary.discrepancyCount}</div>
            <div className="text-sm text-gray-600">Discrepancies Found</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{report.summary.matchCount}</div>
            <div className="text-sm text-gray-600">Perfect Matches</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            <strong>Consistency Score: {Math.round(report.summary.consistencyScore || 0)}%</strong>
            {report.summary.consistencyScore === 100 ? (
              <span className="text-green-600"> - All financial figures match perfectly across documents.</span>
            ) : report.summary.consistencyScore >= 80 ? (
              <span className="text-yellow-600"> - Most figures are consistent with minor discrepancies.</span>
            ) : (
              <span className="text-red-600"> - Significant discrepancies found that require attention.</span>
            )}
          </p>
        </div>
      </Card>

      {/* Document-by-Document Comparison Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Side-by-Side Financial Comparison
        </h3>
        <p className="text-gray-600 mb-4">
          This table shows financial figures extracted from each document, allowing you to compare values across all sources.
        </p>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Financial Category</TableHead>
                <TableHead className="font-semibold">Year</TableHead>
                {report.documentNames.map((docName, index) => (
                  <TableHead key={index} className="font-semibold text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-32" title={docName}>
                        {docName.length > 20 ? `${docName.substring(0, 20)}...` : docName}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold text-center">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((categoryData, categoryIndex) => 
                sortedYears.map((year, yearIndex) => {
                  const yearData = categoryData[`${year}_data`]
                  if (!yearData) return null
                  
                  const hasDiscrepancy = categoryData[`${year}_hasDiscrepancy`]
                  const variance = categoryData[`${year}_variance`] || 0
                  
                  return (
                    <TableRow key={`${categoryIndex}-${yearIndex}`} className={hasDiscrepancy ? 'bg-red-50' : 'bg-green-50'}>
                      <TableCell className="font-medium">{categoryData.category}</TableCell>
                      <TableCell className="font-medium">{year}</TableCell>
                      {report.documentNames.map((docName, docIndex) => {
                        const docFigure = yearData.find((item: any) => item.docName === docName)
                        return (
                          <TableCell key={docIndex} className="text-center">
                            {docFigure ? (
                              <div>
                                <div className="font-semibold">
                                  {formatCurrency(docFigure.figure.value)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {docFigure.figure.location}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {getVarianceIcon(variance)}
                          <Badge variant={hasDiscrepancy ? 'destructive' : 'default'}>
                            {hasDiscrepancy ? 'Discrepancy' : 'Match'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className={`text-center font-semibold ${getVarianceColor(variance)}`}>
                        {variance > 0 ? formatCurrency(variance) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="discrepancies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discrepancies" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Discrepancies ({report.discrepancies.length})</span>
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Matches ({report.matches.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies" className="space-y-4">
          {report.discrepancies.length === 0 ? (
            <Card className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Discrepancies Found!</h3>
              <p className="text-gray-600">All financial figures match perfectly across all documents.</p>
            </Card>
          ) : (
            report.discrepancies.map((discrepancy, index) => (
              <Card key={index} className="p-6 border-red-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800 mb-2">
                      {discrepancy.category} ({discrepancy.year}) - Variance: {formatCurrency(discrepancy.variance)}
                    </h4>
                    <div className="space-y-2 mb-3">
                      {discrepancy.values.map((value, valueIndex) => (
                        <div key={valueIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{value.documentName}:</span>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(value.value)}</div>
                            <div className="text-xs text-gray-500">{value.location}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded">
                      <strong>Suggestion:</strong> {discrepancy.suggestion}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {report.matches.length === 0 ? (
            <Card className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matching Figures</h3>
              <p className="text-gray-600">No identical figures were found across multiple documents.</p>
            </Card>
          ) : (
            report.matches.map((match, index) => (
              <Card key={index} className="p-6 border-green-200">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 mb-2">
                      {match.category} ({match.year}) - Perfect Match
                    </h4>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="font-medium">Consistent Value:</span>
                      <span className="font-semibold text-green-700">{formatCurrency(match.value)}</span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      Found in: {match.documents.join(', ')}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Upload New Documents
        </Button>
        <div className="space-x-3">
          <Button onClick={onGoToExport} className="bg-blue-600 hover:bg-blue-700">
            Export Report
          </Button>
        </div>
      </div>
    </div>
  )
}