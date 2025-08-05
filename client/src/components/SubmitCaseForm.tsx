import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import { insertCaseSubmissionSchema, type Organisation } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

// Comprehensive case submission schema
const submitCaseSchema = z.object({
  // Client details (pre-populated)
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("Invalid email address"),
  clientPhone: z.string().min(1, "Phone number is required"),
  
  // Creditor details
  creditorName: z.string().min(1, "Creditor name is required"),
  
  // Debtor details
  debtorType: z.enum(["individual", "organisation"], {
    required_error: "Please select debtor type",
  }),
  
  // Individual/Sole Trader specific fields
  individualType: z.enum(["individual", "business"]).optional(),
  tradingName: z.string().optional(),
  
  // Organisation specific fields
  organisationName: z.string().optional(),
  organisationTradingName: z.string().optional(),
  companyNumber: z.string().optional(),
  
  // Principal of Business details (for Individual/Sole Trader)
  principalSalutation: z.string().optional(),
  principalFirstName: z.string().optional(),
  principalLastName: z.string().optional(),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  county: z.string().min(1, "County is required"),
  postcode: z.string().min(1, "Postcode is required"),
  mainPhone: z.string().optional(),
  altPhone: z.string().optional(),
  mainEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  altEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  
  // Debt details
  debtDetails: z.string().min(1, "Debt details are required"),
  totalDebtAmount: z.number().min(0.01, "Debt amount must be greater than 0"),
  currency: z.string().default("GBP"),
  
  // Payment terms
  paymentTermsType: z.enum(["days_from_invoice", "days_from_month_end", "other"], {
    required_error: "Please select payment terms",
  }),
  paymentTermsDays: z.number().min(1).optional(),
  paymentTermsOther: z.string().optional(),
  
  // Invoice details
  singleInvoice: z.enum(["yes", "no"], {
    required_error: "Please specify if this relates to a single invoice",
  }),
  firstOverdueDate: z.string().min(1, "First overdue invoice date is required"),
  lastOverdueDate: z.string().min(1, "Last overdue invoice date is required"),
  
  // Additional information
  additionalInfo: z.string().optional(),
}).refine((data) => {
  if (data.debtorType === "individual") {
    return data.individualType;
  }
  return true;
}, {
  message: "Please specify if this is an individual or business",
  path: ["individualType"],
}).refine((data) => {
  if (data.debtorType === "individual" && data.individualType === "business") {
    return data.tradingName && data.tradingName.length > 0;
  }
  return true;
}, {
  message: "Trading name is required for business",
  path: ["tradingName"],
}).refine((data) => {
  if (data.debtorType === "individual") {
    return data.principalSalutation && data.principalFirstName && data.principalLastName;
  }
  return true;
}, {
  message: "Principal details are required for Individual/Sole Trader",
  path: ["principalFirstName"],
});

type SubmitCaseForm = z.infer<typeof submitCaseSchema>;

interface SubmitCaseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitCaseForm({ isOpen, onClose }: SubmitCaseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOtherTerms, setShowOtherTerms] = useState(false);
  const [debtorType, setDebtorType] = useState("");
  const [individualType, setIndividualType] = useState("");
  const [singleInvoice, setSingleInvoice] = useState("");

  const form = useForm<SubmitCaseForm>({
    resolver: zodResolver(submitCaseSchema),
    defaultValues: {
      clientName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
      clientEmail: user?.email || "",
      clientPhone: user?.phone || "",
      debtorType: "individual",
      individualType: "individual",
      tradingName: "",
      organisationName: "",
      organisationTradingName: "",
      companyNumber: "",
      principalSalutation: "",
      principalFirstName: "",
      principalLastName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      county: "",
      postcode: "",
      mainPhone: "",
      altPhone: "",
      mainEmail: "",
      altEmail: "",
      debtDetails: "",
      totalDebtAmount: 0,
      currency: "GBP",
      paymentTermsType: "days_from_invoice",
      paymentTermsDays: 30,
      paymentTermsOther: "",
      singleInvoice: "yes",
      firstOverdueDate: "",
      lastOverdueDate: "",
      additionalInfo: "",
      creditorName: "",
    },
  });

  const submitCaseMutation = useMutation({
    mutationFn: async (data: SubmitCaseForm) => {
      const debtorAddress = `${data.addressLine1}${data.addressLine2 ? ', ' + data.addressLine2 : ''}, ${data.city}, ${data.county}, ${data.postcode}`;
      
      let paymentTerms = "";
      if (data.paymentTermsType === "days_from_invoice") {
        paymentTerms = `${data.paymentTermsDays} days from invoice date`;
      } else if (data.paymentTermsType === "days_from_month_end") {
        paymentTerms = `${data.paymentTermsDays} days from end of month`;
      } else {
        paymentTerms = data.paymentTermsOther || "";
      }

      // Build case name based on type
      let caseName = "";
      if (data.debtorType === "organisation") {
        caseName = data.organisationName || "";
      } else {
        // Individual/Sole Trader
        if (data.individualType === "business") {
          caseName = data.tradingName || "";
        } else {
          // Individual - use principal name
          caseName = `${data.principalSalutation || ""} ${data.principalFirstName || ""} ${data.principalLastName || ""}`.trim();
        }
      }

      // Generate account number
      const accountNumber = `ACC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const caseSubmissionData = {
        accountNumber,
        caseName,
        debtorEmail: data.mainEmail || '',
        debtorPhone: data.mainPhone || '',
        debtorAddress,
        debtorType: data.debtorType === 'individual' ? 'individual' : 'company',
        originalAmount: data.totalDebtAmount,
        outstandingAmount: data.totalDebtAmount,
        stage: 'initial_contact',
        organisationId: user?.organisationId || 1, // Default to first organisation
        externalRef: '',
        notes: `Client: ${data.clientName} (${data.clientEmail}, ${data.clientPhone})\n` +
               `Creditor: ${data.creditorName}\n` +
               `Debt Details: ${data.debtDetails}\n` +
               `Payment Terms: ${paymentTerms}\n` +
               `Single Invoice: ${data.singleInvoice}\n` +
               `First Overdue: ${data.firstOverdueDate}\n` +
               `Last Overdue: ${data.lastOverdueDate}\n` +
               (data.additionalInfo ? `Additional Info: ${data.additionalInfo}\n` : '') +
               (data.debtorType === 'individual' && data.individualType === 'business' ? `Trading Name: ${data.tradingName}\n` : '') +
               (data.debtorType === 'organisation' ? `Organisation: ${data.organisationName}\n` : '') +
               (data.companyNumber ? `Company Number: ${data.companyNumber}\n` : '') +
               (data.altPhone ? `Alt Phone: ${data.altPhone}\n` : '') +
               (data.altEmail ? `Alt Email: ${data.altEmail}\n` : '')
      };

      const response = await apiRequest('POST', '/api/case-submissions', caseSubmissionData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Case Submitted Successfully",
        description: "Your comprehensive case submission has been sent for admin review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-submissions'] });
      form.reset();
      onClose();
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

  const handleSubmit = (data: SubmitCaseForm) => {
    submitCaseMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Submit New Case - Comprehensive Form
          </DialogTitle>
          <DialogDescription>
            Complete all sections below to submit a comprehensive case for admin review. All required fields must be filled.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Client Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Information about the client submitting this case</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="client@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="+44 20 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creditorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creditor Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of the creditor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Debtor Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Debtor Type</CardTitle>
                <CardDescription>Select the type of debtor for this case</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="debtorType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            setDebtorType(value);
                          }}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="individual" />
                            <Label htmlFor="individual">Individual/Sole Trader</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="organisation" id="organisation" />
                            <Label htmlFor="organisation">Organisation</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Individual/Sole Trader Details */}
            {(debtorType === "individual" || form.watch("debtorType") === "individual") && (
              <Card>
                <CardHeader>
                  <CardTitle>Individual/Sole Trader Details</CardTitle>
                  <CardDescription>Provide details for individual or sole trader debtor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="individualType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Type *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              setIndividualType(value);
                            }}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="individual" id="ind_individual" />
                              <Label htmlFor="ind_individual">Individual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="business" id="ind_business" />
                              <Label htmlFor="ind_business">Business/Trading</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(individualType === "business" || form.watch("individualType") === "business") && (
                    <FormField
                      control={form.control}
                      name="tradingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Business trading name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="principalSalutation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salutation *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Mr">Mr</SelectItem>
                                <SelectItem value="Mrs">Mrs</SelectItem>
                                <SelectItem value="Miss">Miss</SelectItem>
                                <SelectItem value="Ms">Ms</SelectItem>
                                <SelectItem value="Dr">Dr</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="principalFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="principalLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organisation Details */}
            {(debtorType === "organisation" || form.watch("debtorType") === "organisation") && (
              <Card>
                <CardHeader>
                  <CardTitle>Organisation Details</CardTitle>
                  <CardDescription>Provide details for organisation debtor</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="organisationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organisationTradingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trading Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Trading name (if different)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Company registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Address and Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle>Address and Contact Details</CardTitle>
                <CardDescription>Debtor's address and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1 *</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input placeholder="Additional address info" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>County *</FormLabel>
                        <FormControl>
                          <Input placeholder="County" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode *</FormLabel>
                        <FormControl>
                          <Input placeholder="Postcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mainPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 20 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 20 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mainEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="debtor@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="alt@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Debt Details */}
            <Card>
              <CardHeader>
                <CardTitle>Debt Details</CardTitle>
                <CardDescription>Information about the debt being recovered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="debtDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debt Details *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the nature of the debt, services provided, goods supplied, etc." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalDebtAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Debt Amount *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Terms</CardTitle>
                <CardDescription>Original payment terms for this debt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="paymentTermsType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Terms Type *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            setShowOtherTerms(value === "other");
                          }}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="days_from_invoice" id="days_from_invoice" />
                            <Label htmlFor="days_from_invoice">Days from invoice date</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="days_from_month_end" id="days_from_month_end" />
                            <Label htmlFor="days_from_month_end">Days from end of month</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other_terms" />
                            <Label htmlFor="other_terms">Other</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!showOtherTerms && (form.watch("paymentTermsType") === "days_from_invoice" || form.watch("paymentTermsType") === "days_from_month_end") && (
                  <FormField
                    control={form.control}
                    name="paymentTermsDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(showOtherTerms || form.watch("paymentTermsType") === "other") && (
                  <FormField
                    control={form.control}
                    name="paymentTermsOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Payment Terms</FormLabel>
                        <FormControl>
                          <Input placeholder="Describe the payment terms" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
                <CardDescription>Information about the invoices related to this debt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="singleInvoice"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Does this relate to a single invoice? *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSingleInvoice(value);
                          }}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="single_yes" />
                            <Label htmlFor="single_yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="single_no" />
                            <Label htmlFor="single_no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstOverdueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Overdue Invoice Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastOverdueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Overdue Invoice Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Any other relevant information about this case</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional details, special circumstances, or notes about this case..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose} disabled={submitCaseMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitCaseMutation.isPending}>
                {submitCaseMutation.isPending ? "Submitting Case..." : "Submit Comprehensive Case"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}