import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, FileText, User, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";

const submitCaseSchema = z.object({
  // Client details (pre-populated)
  clientName: z.string().min(1, "Name is required"),
  clientEmail: z.string().email("Invalid email address"),
  clientPhone: z.string().min(1, "Phone number is required"),
  
  // Creditor details
  creditorName: z.string().min(1, "Creditor name is required"),
  
  // Debtor details
  debtorType: z.enum(["individual", "organization"], {
    required_error: "Please select debtor type",
  }),
  debtorName: z.string().min(1, "Debtor name is required"),
  
  // Individual/Sole Trader specific fields
  individualType: z.enum(["individual", "business"]).optional(),
  tradingName: z.string().optional(),
  
  // Organization specific fields
  organizationName: z.string().optional(),
  organizationTradingName: z.string().optional(),
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
  // If Individual/Sole Trader is selected, individual type is required
  if (data.debtorType === "individual") {
    return data.individualType;
  }
  return true;
}, {
  message: "Please specify if this is an individual or business",
  path: ["individualType"],
}).refine((data) => {
  // If Individual/Sole Trader and business type, trading name is required
  if (data.debtorType === "individual" && data.individualType === "business") {
    return data.tradingName && data.tradingName.length > 0;
  }
  return true;
}, {
  message: "Trading name is required for business",
  path: ["tradingName"],
}).refine((data) => {
  // If Individual/Sole Trader is selected, principal details are required
  if (data.debtorType === "individual") {
    return data.principalSalutation && data.principalFirstName && data.principalLastName;
  }
  return true;
}, {
  message: "Principal of Business details are required for Individual/Sole Trader",
  path: ["principalFirstName"],
});

type SubmitCaseForm = z.infer<typeof submitCaseSchema>;

export default function SubmitCase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showOtherTerms, setShowOtherTerms] = useState(false);
  const [debtorType, setDebtorType] = useState("individual");
  const [individualType, setIndividualType] = useState("individual");

  const form = useForm<SubmitCaseForm>({
    resolver: zodResolver(submitCaseSchema),
    defaultValues: {
      clientName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
      clientEmail: user?.email || "",
      clientPhone: "",
      creditorName: "",
      debtorType: "individual",
      debtorName: "",
      individualType: "individual",
      tradingName: "",
      organizationName: "",
      organizationTradingName: "",
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

      // Build debtor name based on type
      let debtorName = "";
      if (data.debtorType === "organization") {
        debtorName = data.debtorName;
      } else {
        // Individual/Sole Trader
        if (data.individualType === "business") {
          debtorName = data.tradingName || "";
        } else {
          // Individual - use principal name
          debtorName = `${data.principalSalutation || ""} ${data.principalFirstName || ""} ${data.principalLastName || ""}`.trim();
        }
      }

      const caseData = {
        debtorName,
        debtorEmail: data.mainEmail,
        debtorPhone: data.mainPhone,
        debtorAddress,
        originalAmount: data.totalDebtAmount,
        outstandingAmount: data.totalDebtAmount,
        status: "active",
        stage: "new",
        debtDetails: data.debtDetails,
        paymentTerms,
        clientDetails: {
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone,
        },
        debtorType: data.debtorType,
        individualType: data.individualType,
        tradingName: data.tradingName,
        principalDetails: {
          salutation: data.principalSalutation,
          firstName: data.principalFirstName,
          lastName: data.principalLastName,
        },
        altPhone: data.altPhone,
        altEmail: data.altEmail,
      };

      return await apiRequest("POST", "/api/cases", caseData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your case has been submitted successfully. We will review it and contact you soon.",
      });
      // Redirect to dashboard
      setLocation('/');
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
        description: "Failed to submit case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubmitCaseForm) => {
    submitCaseMutation.mutate(data);
  };

  const handlePaymentTermsChange = (value: string) => {
    setShowOtherTerms(value === "other");
    if (value !== "other") {
      form.setValue("paymentTermsOther", "");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="text-acclaim-teal hover:text-acclaim-teal/90"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submit New Case</h1>
          <p className="text-gray-600 mt-1">Please fill in the details below to submit a new debt recovery case</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-acclaim-teal" />
                Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your full name" />
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
                      <FormLabel>Your Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter your email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Contact Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your phone number" />
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
                    <FormLabel>Who is owed the debt?</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Creditors' full name (including any trading name)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Debtor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-acclaim-teal" />
                Debtor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="debtorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Debtor</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setDebtorType(value);
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual">Individual / Sole Trader (non-limited entity)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="organization" id="organization" />
                          <Label htmlFor="organization">Organisation (Limited company, PLC, LLP)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show different fields based on debtor type */}
              {debtorType === "organization" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter organisation name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organizationTradingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trading Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter trading name (if different)" />
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
                          <Input {...field} placeholder="Enter company registration number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="individualType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Is this debtor an individual or business?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              setIndividualType(value);
                            }}
                            defaultValue={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="individual" id="individual-person" />
                              <Label htmlFor="individual-person">Individual</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="business" id="individual-business" />
                              <Label htmlFor="individual-business">Business (Sole Trader)</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {individualType === "business" && (
                    <FormField
                      control={form.control}
                      name="tradingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter the business trading name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Principal of Business Details - Only show for Individual/Sole Trader */}
              {debtorType === "individual" && (
                <div className="border-t pt-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Principal of Business Details</h3>
                    <p className="text-sm text-gray-600">Please provide details of the principal/owner of the business</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="principalSalutation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salutation</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mr">Mr</SelectItem>
                              <SelectItem value="mrs">Mrs</SelectItem>
                              <SelectItem value="miss">Miss</SelectItem>
                              <SelectItem value="ms">Ms</SelectItem>
                              <SelectItem value="dr">Dr</SelectItem>
                              <SelectItem value="prof">Prof</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="principalFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter first name" />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter last name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter address line 1" />
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
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter address line 2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter city" />
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
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter county" />
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
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter postcode" />
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
                      <FormLabel>Main Telephone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter main phone number" />
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
                      <FormLabel>Alternative Telephone (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter alternative phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mainEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter main email address" />
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
                      <FormLabel>Alternative Email (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter alternative email address" />
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
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-acclaim-teal" />
                Debt Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="debtDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details of Debt</FormLabel>
                    <FormDescription>
                      What is the debt for? (e.g., goods sold and delivered on credit terms)
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the nature of the debt and what it relates to"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalDebtAmount"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Total Debt Due to You as of Today</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentTermsType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms of Payment</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePaymentTermsChange(value);
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="days_from_invoice" id="days_from_invoice" />
                          <Label htmlFor="days_from_invoice">Number of days from date of invoice</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="days_from_month_end" id="days_from_month_end" />
                          <Label htmlFor="days_from_month_end">Number of days from end of month of invoice</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other">Other</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("paymentTermsType") !== "other" && (
                <FormField
                  control={form.control}
                  name="paymentTermsDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Days</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="30"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showOtherTerms && (
                <FormField
                  control={form.control}
                  name="paymentTermsOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms (Other)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Please specify your payment terms"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Invoice Details */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                
                <FormField
                  control={form.control}
                  name="singleInvoice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Does the debt relate to a single invoice?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="single-yes" />
                            <Label htmlFor="single-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="single-no" />
                            <Label htmlFor="single-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="firstOverdueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Overdue Invoice Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
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
                        <FormLabel>Last Overdue Invoice Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t pt-6 mt-6">
                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormDescription>
                        Enter any relevant additional information
                      </FormDescription>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Any additional details that might be relevant to the debt recovery"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-acclaim-teal hover:bg-acclaim-teal/90"
                  disabled={submitCaseMutation.isPending}
                >
                  {submitCaseMutation.isPending ? "Submitting..." : "Submit Case"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}