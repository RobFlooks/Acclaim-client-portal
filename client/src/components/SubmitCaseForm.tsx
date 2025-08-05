import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import { insertCaseSubmissionSchema, type Organisation } from "@shared/schema";

interface SubmitCaseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitCaseForm({ isOpen, onClose }: SubmitCaseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    caseName: '',
    debtorEmail: '',
    debtorPhone: '',
    debtorAddress: '',
    debtorType: 'individual',
    originalAmount: '',
    outstandingAmount: '',
    stage: 'initial_contact',
    organisationId: '',
    externalRef: '',
    notes: ''
  });

  // Fetch user's organisations
  const { data: organisations = [] } = useQuery({
    queryKey: ['/api/organisations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/organisations');
      return await response.json();
    },
    retry: false,
  });

  // Submit case submission mutation
  const submitCaseMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      const response = await apiRequest('POST', '/api/case-submissions', submissionData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Case Submitted",
        description: "Your case submission has been sent for admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-submissions'] });
      onClose();
      setFormData({
        accountNumber: '',
        caseName: '',
        debtorEmail: '',
        debtorPhone: '',
        debtorAddress: '',
        debtorType: 'individual',
        originalAmount: '',
        outstandingAmount: '',
        stage: 'initial_contact',
        organisationId: '',
        externalRef: '',
        notes: ''
      });
    },
    onError: (error: any) => {
      console.error('Submit case error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.accountNumber || !formData.caseName || !formData.organisationId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Account Number, Case Name, Organisation).",
        variant: "destructive",
      });
      return;
    }

    // Convert form data to match schema
    const submissionData = {
      ...formData,
      organisationId: parseInt(formData.organisationId),
      originalAmount: formData.originalAmount ? parseFloat(formData.originalAmount) : undefined,
      outstandingAmount: formData.outstandingAmount ? parseFloat(formData.outstandingAmount) : undefined,
    };

    try {
      // Validate data against schema
      const validatedData = insertCaseSubmissionSchema.parse(submissionData);
      submitCaseMutation.mutate(validatedData);
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: "Please check your form data and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Submit New Case
          </DialogTitle>
          <DialogDescription>
            Submit a new case for admin review. Your submission will be processed and added to the case management system.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="e.g., ACC-001"
            />
          </div>
          <div>
            <Label htmlFor="caseName">Case Name *</Label>
            <Input
              id="caseName"
              value={formData.caseName}
              onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
              placeholder="e.g., John Smith vs ABC Ltd"
            />
          </div>
          <div>
            <Label htmlFor="debtorEmail">Debtor Email</Label>
            <Input
              id="debtorEmail"
              type="email"
              value={formData.debtorEmail}
              onChange={(e) => setFormData({ ...formData, debtorEmail: e.target.value })}
              placeholder="debtor@example.com"
            />
          </div>
          <div>
            <Label htmlFor="debtorPhone">Debtor Phone</Label>
            <Input
              id="debtorPhone"
              value={formData.debtorPhone}
              onChange={(e) => setFormData({ ...formData, debtorPhone: e.target.value })}
              placeholder="+44 20 1234 5678"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="debtorAddress">Debtor Address</Label>
            <Input
              id="debtorAddress"
              value={formData.debtorAddress}
              onChange={(e) => setFormData({ ...formData, debtorAddress: e.target.value })}
              placeholder="Full address"
            />
          </div>
          <div>
            <Label htmlFor="debtorType">Debtor Type</Label>
            <Select value={formData.debtorType} onValueChange={(value) => setFormData({ ...formData, debtorType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="sole_trader">Sole Trader</SelectItem>
                <SelectItem value="company_and_individual">Company and Individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="organisationId">Organisation *</Label>
            <Select value={formData.organisationId} onValueChange={(value) => setFormData({ ...formData, organisationId: value })}>
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
              value={formData.originalAmount}
              onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="outstandingAmount">Outstanding Amount (£)</Label>
            <Input
              id="outstandingAmount"
              type="number"
              step="0.01"
              value={formData.outstandingAmount}
              onChange={(e) => setFormData({ ...formData, outstandingAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="stage">Stage</Label>
            <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
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
          <div>
            <Label htmlFor="externalRef">External Reference</Label>
            <Input
              id="externalRef"
              value={formData.externalRef}
              onChange={(e) => setFormData({ ...formData, externalRef: e.target.value })}
              placeholder="Optional reference"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitCaseMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitCaseMutation.isPending}>
            {submitCaseMutation.isPending ? "Submitting..." : "Submit Case"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}