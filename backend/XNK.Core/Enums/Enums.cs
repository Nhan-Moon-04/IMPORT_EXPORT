namespace XNK.Core.Enums;

public enum ShipmentType
{
    Import = 0,  // Nhập khẩu
    Export = 1   // Xuất khẩu
}

public enum ShipmentStatus
{
    Draft = 0,
    PreparingDocuments = 1,
    BookingRequested = 2,
    BookingConfirmed = 3,
    InTransit = 4,
    Arrived = 5,
    CustomsProcessing = 6,
    CustomsCleared = 7,
    Completed = 8,
    Cancelled = 9
}

public enum InvoiceType
{
    CommercialInvoice = 0,
    ProformaInvoice = 1,
    DebitNote = 2,
    CreditNote = 3
}

public enum PaymentStatus
{
    Unpaid = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Overdue = 3
}

public enum PartnerType
{
    Shipper = 0,
    Consignee = 1,
    NotifyParty = 2,
    Forwarder = 3,
    CustomsBroker = 4,
    ShippingLine = 5,
    TransportCompany = 6,
    InspectionAgency = 7
}

public enum DocumentCategory
{
    Contract = 0,
    PurchaseOrder = 1,
    SalesOrder = 2,
    CommercialInvoice = 3,
    PackingList = 4,
    BookingConfirmation = 5,
    BillOfLading = 6,
    CertificateOfOrigin = 7,
    CustomsDeclaration = 8,
    TaxPayment = 9,
    InspectionCertificate = 10,
    TestReport = 11,
    GRS_TC = 12,
    OekoTex = 13,
    FumigationCertificate = 14,
    InsuranceCertificate = 15,
    Email = 16,
    Correspondence = 17,
    Other = 99
}

public enum DeliveryTerm
{
    FOB = 0,
    CIF = 1,
    EXW = 2,
    CFR = 3,
    CIP = 4,
    DAP = 5,
    DDP = 6,
    FCA = 7
}

public enum OrderStatus
{
    Draft = 0,
    Confirmed = 1,
    PartiallyShipped = 2,
    Shipped = 3,
    Completed = 4,
    Cancelled = 5
}

public enum AuditAction
{
    Create = 0,
    Update = 1,
    Delete = 2,
    Upload = 3,
    Download = 4,
    Login = 5,
    Logout = 6
}
