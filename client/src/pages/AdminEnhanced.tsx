import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, Building, Plus, Edit, Trash2, Shield, Key, Copy, UserPlus, AlertTriangle, ShieldCheck, ArrowLeft, Activity, FileText, CreditCard, Archive, ArchiveRestore, Download, Check, Eye, Mail, Bell, BellOff, FilePlus, FileX } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createUserSchema, updateUserSchema, createOrganisationSchema, updateOrganisationSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";
import ApiGuideDownload from "@/components/ApiGuideDownload";
import UserGuideDownload from "@/components/UserGuideDownload";
import UserGuideWordDownload from "@/components/UserGuideWordDownload";
import CaseManagementGuideDownload from "@/components/CaseManagementGuideDownload";

// Documents List Component
function DocumentsList({ submissionId }: { submissionId: number }) {
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['/api/admin/case-submissions', submissionId, 'documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/case-submissions/${submissionId}/documents`);
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading documents...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Error loading documents</div>;
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-4">
        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No documents uploaded with this submission</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {documents.map((doc: any) => (
        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-sm">{doc.fileName}</p>
              <p className="text-xs text-gray-500">
                {formatFileSize(doc.fileSize)} • {doc.fileType} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.open(`/api/admin/case-submissions/documents/${doc.id}`, '_blank');
            }}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}

// Documents Cell Component for table display
function DocumentsCell({ submissionId }: { submissionId: number }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/admin/case-submissions', submissionId, 'documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/case-submissions/${submissionId}/documents`);
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="text-sm">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  const documentCount = documents?.length || 0;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1">
        <FileText className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-500">
          {documentCount} {documentCount === 1 ? 'document' : 'documents'}
        </span>
      </div>
      {documentCount > 0 && (
        <div className="text-xs text-blue-500 mt-1">
          View in details
        </div>
      )}
    </div>
  );
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organisationId: number | null;
  organisationName?: string;
  createdAt: string;
  isAdmin?: boolean;
  phone?: string;
}

interface Organisation {
  id: number;
  name: string;
  createdAt: string;
  userCount: number;
  externalRef?: string;
}

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;
type CreateOrganisationForm = z.infer<typeof createOrganisationSchema>;
type UpdateOrganisationForm = z.infer<typeof updateOrganisationSchema>;

interface Case {
  id: number;
  accountNumber: string;
  caseName: string;
  debtorEmail: string;
  debtorPhone: string;
  originalAmount: string;
  outstandingAmount: string;
  status: string;
  stage: string;
  organisationId: number;
  organisationName?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface CaseSubmission {
  id: number;
  submittedBy: string;
  
  // Client details (person who submitted)
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  
  // Case identification
  caseName: string;
  
  // Debtor type and details
  debtorType: string;
  
  // Individual/Sole Trader specific fields
  individualType?: string;
  tradingName?: string;
  
  // Organisation specific fields
  organisationName?: string;
  organisationTradingName?: string;
  companyNumber?: string;
  
  // Principal of Business details (for Individual/Sole Trader)
  principalSalutation?: string;
  principalFirstName?: string;
  principalLastName?: string;
  
  // Address details
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  
  // Contact details
  mainPhone?: string;
  altPhone?: string;
  mainEmail?: string;
  altEmail?: string;
  
  // Debt details
  debtDetails?: string;
  totalDebtAmount?: number;
  currency?: string;
  
  // Payment terms
  paymentTermsType?: string;
  paymentTermsDays?: number;
  paymentTermsOther?: string;
  
  // Invoice details
  singleInvoice?: string;
  firstOverdueDate?: string;
  lastOverdueDate?: string;
  
  // Additional information
  additionalInfo?: string;
  
  // System fields
  status: string;
  organisationId: number;
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
}

function CaseManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmCase, setDeleteConfirmCase] = useState<Case | null>(null);
  const [archiveConfirmCase, setArchiveConfirmCase] = useState<Case | null>(null);
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    accountNumber: '',
    caseName: '',
    debtorEmail: '',
    debtorPhone: '',
    debtorAddress: '',
    debtorType: 'individual',
    originalAmount: '',
    outstandingAmount: '',
    status: 'new',
    stage: 'initial_contact',
    organisationId: '',
    externalRef: ''
  });

  // CSV Export functionality
  const exportCasesToCSV = () => {
    if (!cases || cases.length === 0) {
      toast({
        title: "No Data",
        description: "No cases available to export.",
        variant: "destructive",
      });
      return;
    }

    // Define CSV headers
    const headers = [
      'Account Number',
      'Case Name',
      'Debtor Email',
      'Debtor Phone',
      'Original Amount',
      'Outstanding Amount',
      'Status',
      'Stage',
      'Organisation',
      'Created Date',
      'Updated Date',
      'Archived',
      'Archived Date'
    ];

    // Convert cases to CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...cases.map((case_: Case) => [
        `"${case_.accountNumber || ''}"`,
        `"${case_.caseName || ''}"`,
        `"${case_.debtorEmail || ''}"`,
        `"${case_.debtorPhone || ''}"`,
        `"${case_.originalAmount || ''}"`,
        `"${case_.outstandingAmount || ''}"`,
        `"${case_.status || ''}"`,
        `"${case_.stage || ''}"`,
        `"${case_.organisationName || ''}"`,
        `"${new Date(case_.createdAt).toLocaleDateString('en-GB')}"`,
        `"${new Date(case_.updatedAt).toLocaleDateString('en-GB')}"`,
        `"${case_.isArchived ? 'Yes' : 'No'}"`,
        `"${case_.archivedAt ? new Date(case_.archivedAt).toLocaleDateString('en-GB') : ''}"`
      ].join(','))
    ];

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cases-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Successfully exported ${cases.length} cases to CSV.`,
    });
  };
  
  // Fetch all cases (including archived ones for admin)
  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/cases/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/cases/all');
      const data = await response.json();
      return data;
    },
    retry: false,
  });

  // Fetch organisations for the new case form
  const { data: organisations = [] } = useQuery({
    queryKey: ['/api/admin/organisations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/organisations');
      return await response.json();
    },
    retry: false,
  });

  // Create new case mutation
  const createCaseMutation = useMutation({
    mutationFn: async (caseData: any) => {
      const response = await apiRequest('POST', '/api/external/cases', caseData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Case Created",
        description: "New case has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
      setShowNewCaseDialog(false);
      setNewCaseForm({
        accountNumber: '',
        caseName: '',
        debtorEmail: '',
        debtorPhone: '',
        debtorAddress: '',
        debtorType: 'individual',
        originalAmount: '',
        outstandingAmount: '',
        status: 'new',
        stage: 'initial_contact',
        organisationId: '',
        externalRef: ''
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Session expired. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitNewCase = () => {
    if (!newCaseForm.accountNumber || !newCaseForm.caseName || !newCaseForm.organisationId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Account Number, Case Name, Organisation).",
        variant: "destructive",
      });
      return;
    }

    const organisation = organisations.find((org: Organisation) => org.id === parseInt(newCaseForm.organisationId));
    if (!organisation) {
      toast({
        title: "Invalid Organisation",
        description: "Please select a valid organisation.",
        variant: "destructive",
      });
      return;
    }

    const caseData = {
      ...newCaseForm,
      organisationExternalRef: organisation.externalRef || organisation.name,
      assignedTo: 'Admin',
      externalRef: newCaseForm.externalRef || `ADMIN-${Date.now()}`
    };

    createCaseMutation.mutate(caseData);
  };

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Archive case mutation
  const archiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Archived",
        description: "Case has been successfully archived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to archive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unarchive case mutation
  const unarchiveCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('PUT', `/api/admin/cases/${caseId}/unarchive`);
    },
    onSuccess: () => {
      toast({
        title: "Case Unarchived",
        description: "Case has been successfully unarchived.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to unarchive case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete case mutation
  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: number) => {
      return await apiRequest('DELETE', `/api/admin/cases/${caseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Case Deleted",
        description: "Case and all associated data have been permanently deleted.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cases/all'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading cases...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading cases: {error.message}</p>
        <p>Please try refreshing the page or contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 px-1">
          Total Cases: {cases.length} | Archived: {cases.filter((c: Case) => c.isArchived).length} | Active: {cases.filter((c: Case) => !c.isArchived).length}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewCaseDialog(true)}
            variant="default"
            size="sm"
            className="gap-2"
            title="Create a new case directly"
          >
            <Plus className="h-4 w-4" />
            Submit New Case
          </Button>
          <Button
            onClick={exportCasesToCSV}
            variant="outline"
            size="sm"
            className="gap-2"
            title="Export all cases to CSV file"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-4">
        {cases.map((case_: Case) => (
          <div key={case_.id} className={`rounded-lg p-4 space-y-3 ${case_.isArchived ? 'bg-gray-50 border' : 'border'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{case_.accountNumber}</div>
                <div className="text-sm text-gray-700">{case_.caseName}</div>
                <div className="text-xs text-gray-500">{case_.organisationName || 'N/A'}</div>
              </div>
              <div className="flex flex-col gap-1">
                {case_.isArchived ? (
                  <Badge variant="secondary" className="text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant={case_.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {case_.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stage:</span>
                <Badge variant="outline" className="text-xs">{case_.stage}</Badge>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-600">Outstanding:</span>
                <span className="font-medium">£{case_.outstandingAmount}</span>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              {case_.isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => unarchiveCaseMutation.mutate(case_.id)}
                  disabled={unarchiveCaseMutation.isPending}
                >
                  <ArchiveRestore className="h-3 w-3 mr-1" />
                  Unarchive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setArchiveConfirmCase(case_)}
                  disabled={archiveCaseMutation.isPending}
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmCase(case_)}
                disabled={deleteCaseMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Number</TableHead>
              <TableHead>Case Name</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((case_: Case) => (
              <TableRow key={case_.id} className={case_.isArchived ? 'bg-gray-50' : ''}>
                <TableCell className="font-medium">{case_.accountNumber}</TableCell>
                <TableCell>{case_.caseName}</TableCell>
                <TableCell>{case_.organisationName || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={case_.status === 'active' ? 'default' : 'secondary'}>
                    {case_.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{case_.stage}</Badge>
                </TableCell>
                <TableCell>£{case_.outstandingAmount}</TableCell>
                <TableCell>
                  {case_.isArchived ? (
                    <Badge variant="secondary">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {case_.isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveCaseMutation.mutate(case_.id)}
                        disabled={unarchiveCaseMutation.isPending}
                        title="Unarchive case"
                      >
                        <ArchiveRestore className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setArchiveConfirmCase(case_)}
                        disabled={archiveCaseMutation.isPending}
                        title="Archive case"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmCase(case_)}
                      disabled={deleteCaseMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      title="Permanently delete case"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmCase} onOpenChange={() => setDeleteConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanent Deletion Warning
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to permanently delete case "{deleteConfirmCase?.caseName}"?
              </p>
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <p className="text-sm text-red-800 font-medium">⚠️ This action cannot be undone!</p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside space-y-1">
                  <li>The case and all its details</li>
                  <li>All messages related to this case</li>
                  <li>All documents attached to this case</li>
                  <li>All payment records for this case</li>
                  <li>All activity history for this case</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Consider archiving the case instead if you want to hide it while preserving the data.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmCase(null)}
              disabled={deleteCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmCase) {
                  deleteCaseMutation.mutate(deleteConfirmCase.id);
                  setDeleteConfirmCase(null);
                }
              }}
              disabled={deleteCaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCaseMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!archiveConfirmCase} onOpenChange={() => setArchiveConfirmCase(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Archive className="h-5 w-5" />
              Archive Case
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p className="font-medium">
                Are you sure you want to archive case "{archiveConfirmCase?.caseName}"?
              </p>
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                <p className="text-sm text-orange-800 font-medium">📦 Archiving will:</p>
                <ul className="text-sm text-orange-700 mt-1 list-disc list-inside space-y-1">
                  <li>Hide the case from normal operations</li>
                  <li>Preserve all data (messages, documents, payments)</li>
                  <li>Allow you to restore it later if needed</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This is a safe operation that can be reversed by unarchiving the case.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setArchiveConfirmCase(null)}
              disabled={archiveCaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (archiveConfirmCase) {
                  archiveCaseMutation.mutate(archiveConfirmCase.id);
                  setArchiveConfirmCase(null);
                }
              }}
              disabled={archiveCaseMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {archiveCaseMutation.isPending ? "Archiving..." : "Archive Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Case Dialog */}
      <Dialog open={showNewCaseDialog} onOpenChange={setShowNewCaseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Submit New Case
            </DialogTitle>
            <DialogDescription>
              Create a new case that can be exported to CSV for upload to your external case management system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={newCaseForm.accountNumber}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, accountNumber: e.target.value })}
                placeholder="e.g., ACC-001"
              />
            </div>
            <div>
              <Label htmlFor="caseName">Case Name *</Label>
              <Input
                id="caseName"
                value={newCaseForm.caseName}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, caseName: e.target.value })}
                placeholder="e.g., John Smith vs ABC Ltd"
              />
            </div>
            <div>
              <Label htmlFor="debtorEmail">Debtor Email</Label>
              <Input
                id="debtorEmail"
                type="email"
                value={newCaseForm.debtorEmail}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorEmail: e.target.value })}
                placeholder="debtor@example.com"
              />
            </div>
            <div>
              <Label htmlFor="debtorPhone">Debtor Phone</Label>
              <Input
                id="debtorPhone"
                value={newCaseForm.debtorPhone}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorPhone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="debtorAddress">Debtor Address</Label>
              <Input
                id="debtorAddress"
                value={newCaseForm.debtorAddress}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, debtorAddress: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div>
              <Label htmlFor="debtorType">Debtor Type</Label>
              <Select value={newCaseForm.debtorType} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, debtorType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organisationId">Organisation *</Label>
              <Select value={newCaseForm.organisationId} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, organisationId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org: Organisation) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="originalAmount">Original Amount (£)</Label>
              <Input
                id="originalAmount"
                type="number"
                step="0.01"
                value={newCaseForm.originalAmount}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, originalAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="outstandingAmount">Outstanding Amount (£)</Label>
              <Input
                id="outstandingAmount"
                type="number"
                step="0.01"
                value={newCaseForm.outstandingAmount}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, outstandingAmount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newCaseForm.status} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Select value={newCaseForm.stage} onValueChange={(value) => setNewCaseForm({ ...newCaseForm, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_contact">Initial Contact</SelectItem>
                  <SelectItem value="investigation">Investigation</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="legal_action">Legal Action</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="externalRef">External Reference</Label>
              <Input
                id="externalRef"
                value={newCaseForm.externalRef}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, externalRef: e.target.value })}
                placeholder="Leave blank for auto-generation"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowNewCaseDialog(false)} disabled={createCaseMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmitNewCase} disabled={createCaseMutation.isPending}>
              {createCaseMutation.isPending ? "Creating..." : "Create Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseSubmissionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<CaseSubmission | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Fetch case submissions
  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: selectedStatus === "all" ? ["/api/admin/case-submissions"] : ["/api/admin/case-submissions", selectedStatus],
    queryFn: async () => {
      const endpoint = selectedStatus === "all" 
        ? "/api/admin/case-submissions" 
        : `/api/admin/case-submissions/${selectedStatus}`;
      const response = await apiRequest("GET", endpoint);
      return await response.json();
    },
    retry: false,
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/case-submissions/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-submissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status",
        variant: "destructive",
      });
    },
  });

  // Delete submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/case-submissions/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/case-submissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
    },
  });

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedSubmissions(new Set(submissions.map((s: CaseSubmission) => s.id)));
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  // Handle individual row selection
  const handleRowSelect = (submissionId: number, checked: boolean) => {
    const newSelected = new Set(selectedSubmissions);
    if (checked) {
      newSelected.add(submissionId);
    } else {
      newSelected.delete(submissionId);
    }
    setSelectedSubmissions(newSelected);
    setSelectAll(newSelected.size === submissions.length);
  };

  // CSV Export functionality for submissions
  const exportSubmissionsToCSV = () => {
    const submissionsToExport = selectedSubmissions.size > 0 
      ? submissions.filter((s: CaseSubmission) => selectedSubmissions.has(s.id))
      : submissions;

    if (!submissionsToExport || submissionsToExport.length === 0) {
      toast({
        title: "No Data",
        description: selectedSubmissions.size > 0 
          ? "No case submissions selected for export." 
          : "No case submissions available to export.",
        variant: "destructive",
      });
      return;
    }

    // Define comprehensive CSV headers to capture all form data
    const headers = [
      'Submission ID',
      'Case Name',
      'Client Name',
      'Client Email', 
      'Client Phone',
      'Debtor Type',
      'Individual Type',
      'Trading Name',
      'Organisation Name',
      'Organisation Trading Name',
      'Company Number',
      'Principal Salutation',
      'Principal First Name',
      'Principal Last Name',
      'Address Line 1',
      'Address Line 2',
      'City',
      'County',
      'Postcode',
      'Main Phone',
      'Alt Phone',
      'Main Email',
      'Alt Email',
      'Debt Details',
      'Total Debt Amount',
      'Currency',
      'Payment Terms Type',
      'Payment Terms Days',
      'Payment Terms Other',
      'Single Invoice',
      'First Overdue Date',
      'Last Overdue Date',
      'Additional Info',
      'Organisation ID',
      'Status',
      'Submitted By',
      'Submitted Date',
      'Processed By',
      'Processed Date'
    ];

    // Convert submissions to CSV rows using actual database fields
    const csvRows = [
      headers.join(','), // Header row
      ...submissionsToExport.map((submission: CaseSubmission) => {
        return [
          `"${submission.id || ''}"`,
          `"${submission.caseName || ''}"`,
          `"${submission.clientName || ''}"`,
          `"${submission.clientEmail || ''}"`,
          `"${submission.clientPhone || ''}"`,
          `"${submission.debtorType || ''}"`,
          `"${submission.individualType || ''}"`,
          `"${submission.tradingName || ''}"`,
          `"${submission.organisationName || ''}"`,
          `"${submission.organisationTradingName || ''}"`,
          `"${submission.companyNumber || ''}"`,
          `"${submission.principalSalutation || ''}"`,
          `"${submission.principalFirstName || ''}"`,
          `"${submission.principalLastName || ''}"`,
          `"${submission.addressLine1 || ''}"`,
          `"${submission.addressLine2 || ''}"`,
          `"${submission.city || ''}"`,
          `"${submission.county || ''}"`,
          `"${submission.postcode || ''}"`,
          `"${submission.mainPhone || ''}"`,
          `"${submission.altPhone || ''}"`,
          `"${submission.mainEmail || ''}"`,
          `"${submission.altEmail || ''}"`,
          `"${submission.debtDetails || ''}"`,
          `"${submission.totalDebtAmount || ''}"`,
          `"${submission.currency || 'GBP'}"`,
          `"${submission.paymentTermsType || ''}"`,
          `"${submission.paymentTermsDays || ''}"`,
          `"${submission.paymentTermsOther || ''}"`,
          `"${submission.singleInvoice || ''}"`,
          `"${submission.firstOverdueDate || ''}"`,
          `"${submission.lastOverdueDate || ''}"`,
          `"${submission.additionalInfo || ''}"`,
          `"${submission.organisationId || ''}"`,
          `"${submission.status || ''}"`,
          `"${submission.submittedBy || ''}"`,
          `"${submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('en-GB') : ''}"`,
          `"${submission.processedBy || ''}"`,
          `"${submission.processedAt ? new Date(submission.processedAt).toLocaleDateString('en-GB') : ''}"`
        ].join(',');
      })
    ];

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `case-submissions-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Successfully exported ${submissionsToExport.length} case submission${submissionsToExport.length === 1 ? '' : 's'} to CSV.`,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) return <div>Loading case submissions...</div>;
  if (error) return <div>Error loading case submissions</div>;

  return (
    <div className="space-y-4">
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-sm">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </Badge>
          {selectedSubmissions.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedSubmissions.size} selected
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedSubmissions(new Set());
                  setSelectAll(false);
                }}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        <Button 
          onClick={exportSubmissionsToCSV} 
          variant="outline" 
          size="sm"
          title={selectedSubmissions.size > 0 
            ? `Export ${selectedSubmissions.size} selected submissions to CSV`
            : 'Export all submissions to CSV file'
          }
        >
          <Download className="h-4 w-4 mr-2" />
          {selectedSubmissions.size > 0 
            ? `Export Selected (${selectedSubmissions.size})`
            : 'Export All'
          }
        </Button>
      </div>

      {/* Submissions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Case Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Debtor Type</TableHead>
              <TableHead>Debtor Details</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Debt Amount</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <p className="text-gray-500">No case submissions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission: CaseSubmission) => (
                <TableRow key={submission.id}>
                  <TableCell className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.has(submission.id)}
                      onChange={(e) => handleRowSelect(submission.id, e.target.checked)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-[150px]">
                      <div className="font-medium truncate">{submission.caseName}</div>
                      <div className="text-xs text-gray-500">ID: {submission.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="font-medium truncate">{submission.clientName}</div>
                      <div className="text-gray-500 truncate">{submission.clientEmail}</div>
                      {submission.clientPhone && <div className="text-gray-500 truncate">{submission.clientPhone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="font-medium truncate">{(submission as any).organisationName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">ID: {submission.organisationId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {submission.debtorType === 'individual' ? 'Individual' : 'Organisation'}
                      </Badge>
                      {submission.individualType && (
                        <div className="text-xs text-gray-500 mt-1">{submission.individualType}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[150px]">
                      {submission.debtorType === 'organisation' ? (
                        <div>
                          <div className="font-medium truncate">{submission.organisationName}</div>
                          {submission.organisationTradingName && (
                            <div className="text-gray-500 truncate">Trading: {submission.organisationTradingName}</div>
                          )}
                          {submission.companyNumber && (
                            <div className="text-gray-500 truncate">Co: {submission.companyNumber}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {submission.tradingName ? (
                            <div className="font-medium truncate">{submission.tradingName}</div>
                          ) : (
                            <div className="font-medium truncate">
                              {submission.principalSalutation} {submission.principalFirstName} {submission.principalLastName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      <div className="truncate">{submission.addressLine1}</div>
                      {submission.addressLine2 && <div className="truncate text-gray-500">{submission.addressLine2}</div>}
                      <div className="truncate">{submission.city}, {submission.county}</div>
                      <div className="truncate font-medium">{submission.postcode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[120px]">
                      {submission.mainPhone && <div className="truncate">{submission.mainPhone}</div>}
                      {submission.altPhone && <div className="truncate text-gray-500">{submission.altPhone}</div>}
                      {submission.mainEmail && <div className="truncate">{submission.mainEmail}</div>}
                      {submission.altEmail && <div className="truncate text-gray-500">{submission.altEmail}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">£{submission.totalDebtAmount?.toLocaleString()}</div>
                      <div className="text-gray-500">{submission.currency || 'GBP'}</div>
                      {submission.singleInvoice && (
                        <div className="text-xs text-gray-500">Single: {submission.singleInvoice}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[100px]">
                      {submission.paymentTermsType && (
                        <div className="truncate">
                          {submission.paymentTermsDays && `${submission.paymentTermsDays} days`}
                          {submission.paymentTermsType === 'days_from_invoice' && ' from invoice'}
                          {submission.paymentTermsType === 'days_from_month_end' && ' from month end'}
                          {submission.paymentTermsType === 'other' && submission.paymentTermsOther}
                        </div>
                      )}
                      {submission.firstOverdueDate && (
                        <div className="text-xs text-gray-500">First: {submission.firstOverdueDate}</div>
                      )}
                      {submission.lastOverdueDate && (
                        <div className="text-xs text-gray-500">Last: {submission.lastOverdueDate}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DocumentsCell submissionId={submission.id} />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(submission.submittedAt).toLocaleDateString('en-GB')}</div>
                      <div className="text-gray-500">by {submission.submittedBy}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowDetailsDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                        title="View submission details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {submission.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'processed' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                            title="Mark as processed"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'rejected' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="Reject submission"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this submission?')) {
                            deleteSubmissionMutation.mutate(submission.id);
                          }
                        }}
                        disabled={deleteSubmissionMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        title="Delete submission permanently"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Comprehensive Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Case Submission Details
            </DialogTitle>
            <DialogDescription>
              Complete information from the comprehensive case submission form
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Account Number</Label>
                    <p className="text-sm">{selectedSubmission.accountNumber}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Case Name</Label>
                    <p className="text-sm">{selectedSubmission.caseName}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedSubmission.status)}>
                      {selectedSubmission.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Organisation</Label>
                    <p className="text-sm">{selectedSubmission.organisationName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Form Data */}
              {selectedSubmission.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehensive Form Data</CardTitle>
                    <CardDescription>All details captured from the submission form</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedSubmission.notes.split('\n').map((line, index) => {
                        if (!line.trim() || !line.includes(':')) return null;
                        const [label, ...valueParts] = line.split(':');
                        const value = valueParts.join(':').trim();
                        
                        return (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-2">
                            <Label className="font-semibold text-sm">{label.trim()}</Label>
                            <p className="text-sm md:col-span-2">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact and Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact & Address</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Debtor Email</Label>
                    <p className="text-sm">{selectedSubmission.debtorEmail || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Debtor Phone</Label>
                    <p className="text-sm">{selectedSubmission.debtorPhone || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-semibold">Debtor Address</Label>
                    <p className="text-sm">{selectedSubmission.debtorAddress || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Original Amount</Label>
                    <p className="text-sm">{formatCurrency(selectedSubmission.originalAmount)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Outstanding Amount</Label>
                    <p className="text-sm">{formatCurrency(selectedSubmission.outstandingAmount)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Debtor Type</Label>
                    <p className="text-sm">{selectedSubmission.debtorType}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Stage</Label>
                    <p className="text-sm">{selectedSubmission.stage}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Supporting Documents
                  </CardTitle>
                  <CardDescription>Files uploaded with this case submission</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentsList submissionId={selectedSubmission.id} />
                </CardContent>
              </Card>

              {/* Submission Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Submitted By</Label>
                    <p className="text-sm">{selectedSubmission.submittedBy}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Submitted Date</Label>
                    <p className="text-sm">{new Date(selectedSubmission.submittedAt).toLocaleDateString('en-GB')}</p>
                  </div>
                  {selectedSubmission.processedBy && (
                    <>
                      <div>
                        <Label className="font-semibold">Processed By</Label>
                        <p className="text-sm">{selectedSubmission.processedBy}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Processed Date</Label>
                        <p className="text-sm">{selectedSubmission.processedAt ? new Date(selectedSubmission.processedAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {selectedSubmission.externalRef && (
                    <div className="md:col-span-2">
                      <Label className="font-semibold">External Reference</Label>
                      <p className="text-sm">{selectedSubmission.externalRef}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                {selectedSubmission.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'processed' });
                        setShowDetailsDialog(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Processed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSubmission.id, status: 'rejected' });
                        setShowDetailsDialog(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for organisation management
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgExternalRef, setNewOrgExternalRef] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [showAssignUser, setShowAssignUser] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("none");
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [orgFormData, setOrgFormData] = useState<CreateOrganisationForm>({
    name: "",
    externalRef: "",
  });

  // State for user management
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<CreateUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organisationId: undefined,
    isAdmin: false,
  });
  const [tempPassword, setTempPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState(false);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false); // true = new user, false = password reset

  // Fetch users with their organisations
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/admin/users-with-orgs"],
    retry: false,
  });

  // Fetch organisations
  const { data: organisations = [], isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["/api/admin/organisations"],
    retry: false,
  });

  // Create organisation mutation
  const createOrganisationMutation = useMutation({
    mutationFn: async (data: CreateOrganisationForm) => {
      const response = await apiRequest("POST", `/api/admin/organisations`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "", externalRef: "" });
      setNewOrgName("");
      setNewOrgExternalRef("");
      setShowCreateOrg(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create organisation",
        variant: "destructive",
      });
    },
  });

  // Update organisation mutation
  const updateOrganisationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateOrganisationForm }) => {
      const response = await apiRequest("PUT", `/api/admin/organisations/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      setOrgFormData({ name: "", externalRef: "" });
      setEditingOrg(null);
      setShowEditOrg(false);
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update organisation",
        variant: "destructive",
      });
    },
  });

  // Delete organisation mutation
  const deleteOrganisationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/organisations/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Organisation deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete organisation",
        variant: "destructive",
      });
    },
  });

  // Assign user to organisation mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/assign`, { organisationId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User assigned to organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations"] });
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setSelectedUser(null);
      setSelectedOrgId("");
      setShowAssignUser(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to assign user to organisation",
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest("POST", `/api/admin/users`, userData);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Create user response:", data);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      setUserFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organisationId: undefined,
        isAdmin: false,
      });
      setShowCreateUser(false);
      setTempPassword(data.tempPassword || "");
      // Handle nested user structure from API: data.user.user.id or data.user.id
      const userId = data.user?.user?.id || data.user?.id || null;
      setCreatedUserId(userId);
      setIsNewUserFlow(true); // This is a new user creation
      setShowPasswordDialog(true);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      return await response.json();
    },
    onSuccess: (data, userId) => {
      console.log("Reset password response:", data);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setTempPassword(data.tempPassword || "");
      setCreatedUserId(userId);
      setIsNewUserFlow(false); // This is a password reset, not new user
      setShowPasswordDialog(true);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Multi-organisation management mutations
  const addUserToOrgMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/organisations`, { organisationId });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User added to organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to organisation",
        variant: "destructive",
      });
    },
  });

  const removeUserFromOrgMutation = useMutation({
    mutationFn: async ({ userId, organisationId }: { userId: string; organisationId: number }) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}/organisations/${organisationId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "User removed from organisation successfully",
      });
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/users-with-orgs"] });
      
      // Invalidate user access queries - access may have changed for any user
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to remove user from organisation";
      if (errorMessage.includes("Cannot remove yourself from your last organisation")) {
        toast({
          title: "Cannot Remove Organisation",
          description: "You cannot remove yourself from your last organisation. Please assign yourself to another organisation first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const endpoint = makeAdmin ? "make-admin" : "remove-admin";
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/${endpoint}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    },
  });

  // Toggle case submission permission mutation
  const toggleCaseSubmissionMutation = useMutation({
    mutationFn: async ({ userId, canSubmitCases }: { userId: string; canSubmitCases: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${userId}/case-submission`, { canSubmitCases });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update case submission permission",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Deleted",
        description: data.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-orgs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Send welcome email mutation
  const sendWelcomeEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/send-welcome-email`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome Email Sent",
        description: data.message,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome email",
        variant: "destructive",
      });
    },
  });

  // Copy temp password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Temporary password copied to clipboard",
    });
  };

  const handleSendWelcomeEmail = async () => {
    if (!createdUserId || !tempPassword) {
      toast({
        title: "Error",
        description: "Unable to send welcome email - missing user information",
        variant: "destructive",
      });
      return;
    }

    setSendingWelcomeEmail(true);
    try {
      const response = await apiRequest("POST", `/api/admin/users/${createdUserId}/send-welcome-email`, {
        temporaryPassword: tempPassword
      });
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "Welcome emails sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send welcome emails",
        variant: "destructive",
      });
    } finally {
      setSendingWelcomeEmail(false);
    }
  };

  const handleSendPasswordEmail = async () => {
    if (!createdUserId || !tempPassword) {
      toast({
        title: "Error",
        description: "Unable to send password email - missing user information",
        variant: "destructive",
      });
      return;
    }

    setSendingPasswordEmail(true);
    try {
      const response = await apiRequest("POST", `/api/admin/users/${createdUserId}/send-password-email`, {
        temporaryPassword: tempPassword
      });
      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "Password email sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password email",
        variant: "destructive",
      });
    } finally {
      setSendingPasswordEmail(false);
    }
  };

  // Check for admin access errors
  if (usersError || orgsError) {
    const errorMessage = (usersError as any)?.message || (orgsError as any)?.message;
    
    if (errorMessage?.includes("Admin access required") || errorMessage?.includes("403")) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have admin privileges to access this panel.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your administrator to request admin access.</p>
          </div>
        </div>
      );
    }
  }

  if (usersLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-600 text-sm sm:text-base">Comprehensive user and organisation management</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:items-center">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/system-monitoring">
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">System Monitoring</span>
              <span className="sm:hidden">System</span>
            </Button>
          </Link>
          <Link href="/admin-payment-performance-report">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Payment Performance</span>
              <span className="sm:hidden">Payments</span>
            </Button>
          </Link>
          <Link href="/advanced-reports">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Advanced Reports</span>
              <span className="sm:hidden">Reports</span>
            </Button>
          </Link>
          <Link href="/audit-management">
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Audit Management</span>
              <span className="sm:hidden">Audit</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter((u: User) => !u.organisationId).length || 0} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organisations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active organisations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.filter((u: User) => u.isAdmin).length || 0}</div>
            <p className="text-xs text-muted-foreground">With admin privileges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">@chadlaw Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u: User) => u.email?.endsWith('@chadlaw.co.uk')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Internal users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-full min-w-max sm:w-full sm:min-w-0">
            <TabsTrigger value="users" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="organisations" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Organisations</span>
              <span className="sm:hidden">Orgs</span>
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Case Management</span>
              <span className="sm:hidden">Cases</span>
            </TabsTrigger>
            <TabsTrigger value="case-submissions" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">Case Submissions</span>
              <span className="sm:hidden">Submits</span>
            </TabsTrigger>

            <TabsTrigger value="user-guide" className="flex-1 text-xs sm:text-sm">
              <span className="hidden sm:inline">User Guide</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create and manage user accounts with comprehensive controls</CardDescription>
                </div>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with temporary password
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={userFormData.firstName}
                            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={userFormData.lastName}
                            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          placeholder="+44 20 7123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organisation">Organisation</Label>
                        <Select 
                          value={userFormData.organisationId?.toString() || "none"}
                          onValueChange={(value) => setUserFormData({ 
                            ...userFormData, 
                            organisationId: value === "none" ? undefined : parseInt(value) 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select organisation (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No organisation</SelectItem>
                            {organisations?.map((org: Organisation) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{org.name}</span>
                                  {org.externalRef && (
                                    <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isAdmin"
                          checked={userFormData.isAdmin}
                          onCheckedChange={(checked) => setUserFormData({ ...userFormData, isAdmin: checked as boolean })}
                        />
                        <Label htmlFor="isAdmin">Admin privileges</Label>
                      </div>
                      {userFormData.isAdmin && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <p className="text-sm text-amber-700">
                              Admin privileges can only be assigned to @chadlaw.co.uk email addresses
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                      <Button variant="outline" onClick={() => setShowCreateUser(false)} className="order-2 sm:order-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(userFormData)}
                        disabled={createUserMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90 order-1 sm:order-2"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Card Layout */}
              <div className="block sm:hidden space-y-4">
                {users?.map((user: User) => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </div>
                      <div className="flex gap-1">
                        {user.isAdmin && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                            Admin
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Email:</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-right">{user.email}</span>
                          {user.email?.endsWith('@chadlaw.co.uk') && (
                            <Shield className="h-3 w-3 text-blue-600" />
                          )}
                          {(user as any).emailNotifications === false ? (
                            <BellOff className="h-3 w-3 text-gray-400" title="Email notifications disabled" />
                          ) : (
                            <Bell className="h-3 w-3 text-green-500" title="Email notifications enabled" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span>{user.phone || "-"}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-gray-600">Organisations:</span>
                        <div className="space-y-1">
                          {/* Legacy organisation (from organisationId field) */}
                          {user.organisationName && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {user.organisationName}
                              </Badge>
                              <span className="text-xs text-gray-500">(legacy)</span>
                            </div>
                          )}
                          {/* Additional organisations (from junction table) */}
                          {(user as any).organisations?.map((org: Organisation) => (
                            <div key={org.id} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {org.name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-3 w-3 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  const confirmation = confirm(`Remove ${user.firstName} ${user.lastName} from ${org.name}?`);
                                  if (confirmation) {
                                    removeUserFromOrgMutation.mutate({
                                      userId: user.id,
                                      organisationId: org.id
                                    });
                                  }
                                }}
                                disabled={removeUserFromOrgMutation.isPending}
                                title={`Remove from ${org.name}`}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          {!user.organisationName && !(user as any).organisations?.length && (
                            <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignUser(true);
                        }}
                        title="Assign user to organisation"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPasswordMutation.mutate(user.id)}
                        disabled={resetPasswordMutation.isPending}
                        title="Reset user password"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hasTemporaryPassword = (user as any).temporaryPassword;
                          const message = hasTemporaryPassword
                            ? `Send welcome email to ${user.firstName} ${user.lastName}?\n\nThis will send their username and temporary password to ${user.email}.`
                            : `Send welcome email to ${user.firstName} ${user.lastName}?\n\nNote: This user has already logged in, so the email will include instructions to reset their password if needed.`;
                          
                          const confirmation = confirm(message);
                          if (confirmation) {
                            sendWelcomeEmailMutation.mutate(user.id);
                          }
                        }}
                        disabled={sendWelcomeEmailMutation.isPending}
                        title="Send welcome email with login details"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) {
                            alert('Admin privileges can only be granted to @chadlaw.co.uk email addresses.');
                            return;
                          }
                          
                          const action = user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
                          const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                          if (confirmation) {
                            toggleAdminMutation.mutate({
                              userId: user.id,
                              makeAdmin: !user.isAdmin
                            });
                          }
                        }}
                        disabled={toggleAdminMutation.isPending || (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk'))}
                        className={(!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) ? 'opacity-50 cursor-not-allowed' : ''}
                        title={user.isAdmin ? "Remove admin privileges" : "Grant admin privileges"}
                      >
                        {user.isAdmin ? (
                          <ShieldCheck className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Shield className="h-3 w-3" />
                        )}
                        Admin
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentValue = (user as any).canSubmitCases !== false;
                          const action = currentValue ? 'disable' : 'enable';
                          const confirmation = confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} case submission for ${user.firstName} ${user.lastName}?`);
                          if (confirmation) {
                            toggleCaseSubmissionMutation.mutate({
                              userId: user.id,
                              canSubmitCases: !currentValue
                            });
                          }
                        }}
                        disabled={toggleCaseSubmissionMutation.isPending}
                        title={(user as any).canSubmitCases !== false ? "Can submit cases - click to disable" : "Cannot submit cases - click to enable"}
                      >
                        {(user as any).canSubmitCases !== false ? (
                          <FilePlus className="h-3 w-3 text-green-600" />
                        ) : (
                          <FileX className="h-3 w-3 text-gray-400" />
                        )}
                        Cases
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const confirmation = confirm(`Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This action cannot be undone.`);
                          if (confirmation) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                        title="Delete user permanently"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{user.email}</span>
                            {user.email?.endsWith('@chadlaw.co.uk') && (
                              <Shield className="h-3 w-3 text-blue-600" />
                            )}
                            {(user as any).emailNotifications === false ? (
                              <BellOff className="h-3 w-3 text-gray-400" title="Email notifications disabled" />
                            ) : (
                              <Bell className="h-3 w-3 text-green-500" title="Email notifications enabled" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* Legacy organisation (from organisationId field) */}
                            {user.organisationName && (
                              <Badge variant="outline" className="mr-1 mb-1">
                                {user.organisationName}
                              </Badge>
                            )}
                            {/* Additional organisations (from junction table) */}
                            {(user as any).organisations?.map((org: Organisation) => (
                              <div key={org.id} className="flex items-center gap-1 mb-1">
                                <Badge variant="outline" className="mr-1">
                                  {org.name}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    const confirmation = confirm(`Remove ${user.firstName} ${user.lastName} from ${org.name}?`);
                                    if (confirmation) {
                                      removeUserFromOrgMutation.mutate({
                                        userId: user.id,
                                        organisationId: org.id
                                      });
                                    }
                                  }}
                                  disabled={removeUserFromOrgMutation.isPending}
                                  title={`Remove from ${org.name}`}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                            {!user.organisationName && !(user as any).organisations?.length && (
                              <Badge variant="secondary">Unassigned</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.isAdmin && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">
                                Admin
                              </Badge>
                            )}
                            <Badge variant="outline">Active</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAssignUser(true);
                              }}
                              title="Assign to organisation"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetPasswordMutation.mutate(user.id)}
                              disabled={resetPasswordMutation.isPending}
                              title="Reset user password"
                            >
                              <Key className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const hasTemporaryPassword = (user as any).temporaryPassword;
                                const message = hasTemporaryPassword
                                  ? `Send welcome email to ${user.firstName} ${user.lastName}?\n\nThis will send their username and temporary password to ${user.email}.`
                                  : `Send welcome email to ${user.firstName} ${user.lastName}?\n\nNote: This user has already logged in, so the email will include instructions to reset their password if needed.`;
                                
                                const confirmation = confirm(message);
                                if (confirmation) {
                                  sendWelcomeEmailMutation.mutate(user.id);
                                }
                              }}
                              disabled={sendWelcomeEmailMutation.isPending}
                              title="Send welcome email with login details"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Check if trying to grant admin to non-chadlaw email
                                if (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) {
                                  alert('Admin privileges can only be granted to @chadlaw.co.uk email addresses.');
                                  return;
                                }
                                
                                const action = user.isAdmin ? 'remove admin privileges from' : 'grant admin privileges to';
                                const confirmation = confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`);
                                if (confirmation) {
                                  toggleAdminMutation.mutate({
                                    userId: user.id,
                                    makeAdmin: !user.isAdmin
                                  });
                                }
                              }}
                              disabled={toggleAdminMutation.isPending || (!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk'))}
                              className={(!user.isAdmin && !user.email?.endsWith('@chadlaw.co.uk')) ? 'opacity-50 cursor-not-allowed' : ''}
                              title={user.isAdmin ? "Remove admin privileges" : "Grant admin privileges"}
                            >
                              {user.isAdmin ? (
                                <ShieldCheck className="h-3 w-3 text-blue-600" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentValue = (user as any).canSubmitCases !== false;
                                const action = currentValue ? 'disable' : 'enable';
                                const confirmation = confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} case submission for ${user.firstName} ${user.lastName}?`);
                                if (confirmation) {
                                  toggleCaseSubmissionMutation.mutate({
                                    userId: user.id,
                                    canSubmitCases: !currentValue
                                  });
                                }
                              }}
                              disabled={toggleCaseSubmissionMutation.isPending}
                              title={(user as any).canSubmitCases !== false ? "Can submit cases - click to disable" : "Cannot submit cases - click to enable"}
                            >
                              {(user as any).canSubmitCases !== false ? (
                                <FilePlus className="h-3 w-3 text-green-600" />
                              ) : (
                                <FileX className="h-3 w-3 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const confirmation = confirm(`Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This action cannot be undone.`);
                                if (confirmation) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                              title="Delete user permanently"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisations Tab */}
        <TabsContent value="organisations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organisations</CardTitle>
                  <CardDescription>Manage client organisations</CardDescription>
                </div>
                <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
                  <DialogTrigger asChild>
                    <Button className="bg-acclaim-teal hover:bg-acclaim-teal/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Organisation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Organisation</DialogTitle>
                      <DialogDescription>
                        Add a new client organisation to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Organisation Name</Label>
                        <Input
                          id="name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organisation name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalRef">Client Code (Optional)</Label>
                        <Input
                          id="externalRef"
                          value={newOrgExternalRef}
                          onChange={(e) => setNewOrgExternalRef(e.target.value)}
                          placeholder="Enter client code from case management system"
                        />
                        <p className="text-sm text-muted-foreground">
                          This is the client code as it appears in your case management system (e.g., SOS).
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        setShowCreateOrg(false);
                        setNewOrgName("");
                        setNewOrgExternalRef("");
                      }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          console.log('Frontend sending data:', { 
                            name: newOrgName, 
                            externalRef: newOrgExternalRef || undefined 
                          });
                          createOrganisationMutation.mutate({ 
                            name: newOrgName, 
                            externalRef: newOrgExternalRef || undefined 
                          });
                        }}
                        disabled={createOrganisationMutation.isPending}
                        className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                      >
                        {createOrganisationMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organisations?.map((org: Organisation) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-gray-500">ID: {org.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.userCount} users</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingOrg(org);
                              setOrgFormData({ 
                                name: org.name, 
                                externalRef: org.externalRef || undefined 
                              });
                              setShowEditOrg(true);
                            }}
                            title="Edit organisation details"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                                deleteOrganisationMutation.mutate(org.id);
                              }
                            }}
                            disabled={deleteOrganisationMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            title="Delete organisation permanently"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Case Management</CardTitle>
                  <CardDescription>Archive or permanently delete cases across all organisations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CaseManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Case Submissions Tab */}
        <TabsContent value="case-submissions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Case Submissions</CardTitle>
                  <CardDescription>Review and manage case submissions from users</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CaseSubmissionsTab />
            </CardContent>
          </Card>
        </TabsContent>



        {/* User Guide Tab */}
        <TabsContent value="user-guide">
          <div className="flex justify-center">
            <div className="space-y-6 max-w-4xl">
              <UserGuideDownload />
              <UserGuideWordDownload />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>
              Update the organisation details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Organisation Name</Label>
              <Input
                id="editOrgName"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                placeholder="Enter organisation name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOrgExternalRef">Client Code (Optional)</Label>
              <Input
                id="editOrgExternalRef"
                value={orgFormData.externalRef || ""}
                onChange={(e) => setOrgFormData({ ...orgFormData, externalRef: e.target.value || undefined })}
                placeholder="Enter client code from case management system"
              />
              <p className="text-sm text-muted-foreground">
                This is the client code as it appears in your case management system (e.g., SOS).
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowEditOrg(false);
              setEditingOrg(null);
              setOrgFormData({ name: "", externalRef: "" });
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingOrg) {
                  updateOrganisationMutation.mutate({ 
                    id: editingOrg.id, 
                    data: orgFormData 
                  });
                }
              }}
              disabled={updateOrganisationMutation.isPending}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {updateOrganisationMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog - Multi-Organisation Management */}
      <Dialog open={showAssignUser} onOpenChange={setShowAssignUser}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Organisation Assignments</DialogTitle>
            <DialogDescription>
              Manage {selectedUser?.firstName} {selectedUser?.lastName}'s organisation assignments
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Show current assignments */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Assignments:</Label>
              <div className="space-y-2">
                {/* Legacy organisation (from organisationId field) */}
                {selectedUser?.organisationName && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge variant="outline" className="mr-2">
                      {selectedUser.organisationName} (legacy)
                    </Badge>
                    <span className="text-xs text-gray-500">Primary organisation</span>
                  </div>
                )}
                {/* Additional organisations (from junction table) */}
                {(selectedUser as any)?.organisations?.map((org: Organisation) => (
                  <div key={org.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{org.name}</Badge>
                      {org.externalRef && (
                        <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        const confirmation = confirm(`Remove ${selectedUser?.firstName} ${selectedUser?.lastName} from ${org.name}?`);
                        if (confirmation) {
                          removeUserFromOrgMutation.mutate({
                            userId: selectedUser!.id,
                            organisationId: org.id
                          });
                        }
                      }}
                      disabled={removeUserFromOrgMutation.isPending}
                      title={`Remove from ${org.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {!selectedUser?.organisationName && !(selectedUser as any)?.organisations?.length && (
                  <div className="p-2 bg-gray-50 rounded text-center text-gray-500">
                    No organisation assignments
                  </div>
                )}
              </div>
            </div>

            {/* Add to new organisation */}
            <div className="space-y-2">
              <Label htmlFor="newOrganisation" className="text-sm font-medium">Add to Organisation:</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation to add" />
                </SelectTrigger>
                <SelectContent>
                  {organisations?.filter((org: Organisation) => {
                    // Filter out already assigned organisations
                    const currentOrgIds = (selectedUser as any)?.organisations?.map((o: Organisation) => o.id) || [];
                    return !currentOrgIds.includes(org.id) && org.id !== selectedUser?.organisationId;
                  }).map((org: Organisation) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{org.name}</span>
                        {org.externalRef && (
                          <span className="text-xs text-gray-500">Ref: {org.externalRef}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignUser(false);
                setSelectedOrgId("");
              }}
              disabled={addUserToOrgMutation.isPending || removeUserFromOrgMutation.isPending}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && selectedOrgId) {
                  const selectedOrg = organisations?.find(org => org.id.toString() === selectedOrgId);
                  const confirmMessage = `Add ${selectedUser.firstName} ${selectedUser.lastName} to ${selectedOrg?.name}${selectedOrg?.externalRef ? ` (Ref: ${selectedOrg.externalRef})` : ''}?`;
                  
                  if (confirm(confirmMessage)) {
                    addUserToOrgMutation.mutate({
                      userId: selectedUser.id,
                      organisationId: parseInt(selectedOrgId),
                    });
                    setSelectedOrgId("");
                  }
                }
              }}
              disabled={addUserToOrgMutation.isPending || !selectedOrgId}
              className="bg-acclaim-teal hover:bg-acclaim-teal/90"
            >
              {addUserToOrgMutation.isPending ? "Adding..." : "Add to Organisation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Created</DialogTitle>
            <DialogDescription>
              Please provide this temporary password to the user. They will be required to change it on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono bg-gray-50"
                  placeholder={!tempPassword ? "Loading..." : ""}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(tempPassword)}
                  disabled={!tempPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {tempPassword && (
                <p className="text-xs text-gray-500 mt-1">
                  Password length: {tempPassword.length} characters
                </p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  This password will only be shown once. Make sure to copy it and provide it to the user securely.
                </p>
              </div>
            </div>

            {createdUserId && isNewUserFlow && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-700 mb-3">
                  <strong>Send Welcome Emails</strong><br />
                  Click below to send two emails to the user:
                </p>
                <ul className="text-sm text-blue-600 mb-3 ml-4 list-disc">
                  <li>Welcome email with portal link</li>
                  <li>Separate email with temporary password</li>
                </ul>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> The user must be assigned to an organisation before sending welcome emails. Close this dialog and assign them first if needed.
                  </p>
                </div>
                <Button
                  onClick={handleSendWelcomeEmail}
                  disabled={sendingWelcomeEmail || !tempPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {sendingWelcomeEmail ? (
                    <>
                      <Mail className="h-4 w-4 mr-2 animate-pulse" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Welcome Emails
                    </>
                  )}
                </Button>
              </div>
            )}

            {createdUserId && !isNewUserFlow && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-700 mb-3">
                  <strong>Send Password Email</strong><br />
                  Click below to email the new temporary password to the user.
                </p>
                <Button
                  onClick={handleSendPasswordEmail}
                  disabled={sendingPasswordEmail || !tempPassword}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {sendingPasswordEmail ? (
                    <>
                      <Mail className="h-4 w-4 mr-2 animate-pulse" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Password Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => {
              setShowPasswordDialog(false);
              setCreatedUserId(null);
              setIsNewUserFlow(false);
            }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}