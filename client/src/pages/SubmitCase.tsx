import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  debtorType: z.enum(["individual", "organisation"], {
    required_error: "Please select debtor type",
  }),
  caseName: z.string().min(1, "Case name is required"),
  
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
  const [debtorType, setDebtorType] = useState("");
  const [individualType, setIndividualType] = useState("");
  const [singleInvoice, setSingleInvoice] = useState("");
  const [organisationNameValue, setOrganisationNameValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const form = useForm<SubmitCaseForm>({
    resolver: zodResolver(submitCaseSchema),
    defaultValues: {
      clientName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
      clientEmail: user?.email || "",
      clientPhone: user?.phone || "",

      debtorType: "",
      caseName: "",
      individualType: "",
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
      currency: "",
      paymentTermsType: "",
      paymentTermsDays: 30,
      paymentTermsOther: "",
      singleInvoice: "",
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

      // Build case name based on type
      let caseName = "";
      if (data.debtorType === "organisation") {
        caseName = data.organisationName;
      } else {
        // Individual/Sole Trader
        if (data.individualType === "business") {
          caseName = data.tradingName || "";
        } else {
          // Individual - use principal name
          caseName = `${data.principalSalutation || ""} ${data.principalFirstName || ""} ${data.principalLastName || ""}`.trim();
        }
      }

      const caseData = {
        caseName,
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
        organisationName: data.organisationName,
        organisationTradingName: data.organisationTradingName,
        companyNumber: data.companyNumber,
        principalDetails: {
          salutation: data.principalSalutation,
          firstName: data.principalFirstName,
          lastName: data.principalLastName,
        },
        altPhone: data.altPhone,
        altEmail: data.altEmail,
        creditorName: data.creditorName,
        currency: data.currency,
        singleInvoice: data.singleInvoice,
        firstOverdueDate: data.firstOverdueDate,
        lastOverdueDate: data.lastOverdueDate,
        additionalInfo: data.additionalInfo,
      };

      // Create FormData for file upload
      const formData = new FormData();
      
      // Add case data
      formData.append("caseData", JSON.stringify(caseData));
      
      // Add files
      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });
      
      // Use fetch directly for file upload
      const response = await fetch("/api/cases", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
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

      {/* Process Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">What happens after submission?</h3>
              <p className="mt-1 text-sm text-blue-700">
                Once you submit this case, our team will be automatically notified and will begin processing your request. 
                Your case will appear in your account dashboard after our team has completed the necessary conflict checks 
                and created the matter in our case management system. This typically takes 1-2 business days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                          // Clear all fields when switching debtor type
                          if (value === "organisation") {
                            // Clear individual fields
                            form.setValue("individualType", "");
                            form.setValue("tradingName", "");
                            form.setValue("principalSalutation", "");
                            form.setValue("principalFirstName", "");
                            form.setValue("principalLastName", "");
                            // Ensure organisation fields are clean
                            form.setValue("organisationName", "");
                            form.setValue("organisationTradingName", "");
                            form.setValue("companyNumber", "");
                            // Clear organisation name state
                            setOrganisationNameValue("");
                            // Reset individual type state
                            setIndividualType("");
                          } else if (value === "individual") {
                            // Clear organisation fields
                            form.setValue("organisationName", "");
                            form.setValue("organisationTradingName", "");
                            form.setValue("companyNumber", "");
                            // Clear organisation name state
                            setOrganisationNameValue("");
                            // Reset individual type
                            setIndividualType("");
                          }
                        }}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="individual" id="individual" />
                          <Label htmlFor="individual">Individual / Sole Trader (non-limited entity)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="organisation" id="organisation" />
                          <Label htmlFor="organisation">Organisation (Limited company, PLC, LLP)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show different fields based on debtor type */}
              {debtorType === "organisation" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="organisationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Name</FormLabel>
                        <FormControl>
                          <Input 
                            key={`org-name-${debtorType}`}
                            placeholder="Enter organisation name" 
                            value={organisationNameValue}
                            onChange={(e) => {
                              setOrganisationNameValue(e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
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
                            value={field.value}
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        value={field.value}
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSingleInvoice(value);
                            // Clear dates when switching
                            if (value === "yes") {
                              form.setValue("lastOverdueDate", "");
                            } else {
                              form.setValue("firstOverdueDate", "");
                            }
                          }}
                          value={field.value}
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

                {singleInvoice === "yes" ? (
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="firstOverdueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
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
                )}
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

          {/* Supporting Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Supporting Documents</CardTitle>
              <CardDescription>
                Upload any documents that support your case (invoices, contracts, correspondence, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Files (Max 10MB each)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setUploadedFiles(prev => [...prev, ...files]);
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#008a8a59] file:text-[#0f766e] hover:file:bg-[#008a8a80]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF
                  </p>
                </div>

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Uploaded Files:</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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