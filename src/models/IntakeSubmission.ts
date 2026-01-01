import mongoose, { type Document, Schema } from "mongoose"

export interface IIntakeSubmission extends Document {
  _id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  form_type: "ideation" | "active_business" | "investor"

  // Founder & Contact Information (all forms)
  full_name: string
  country: string
  national_id?: string
  date_of_birth?: string
  gender?: string
  phone: string
  email: string
  physical_address?: string
  marital_status?: string
  dependents?: number

  // Employment & Education
  current_employment?: {
    position?: string
    company?: string
    salary?: number
    start_date?: string
  }
  previous_employment?: Array<{
    position?: string
    company?: string
    dates?: string
  }>
  education?: {
    degree?: string
    institution?: string
    year?: number
    field?: string
  }
  current_occupation?: string
  work_experience?: string
  education_level?: string
  entrepreneurial_exp?: string
  why_right_person?: string

  // For Ideation & Active Business
  business_name?: string
  trading_name?: string
  tagline?: string
  registration_number?: string
  date_of_incorporation?: string
  industry?: string
  website?: string
  business_address?: string
  business_contacts?: string

  // Ideation Form Specific
  idea_description?: string
  problem_solved?: string
  target_customers?: string
  market_size_estimate?: string
  competitors?: string[]
  unique_value_proposition?: string
  why_now?: string
  marketing_channels?: string[]
  market_research_done?: boolean
  market_research_description?: string
  customer_interviews_done?: boolean
  customer_interviews_feedback?: string

  // Active Business Specific
  num_employees_fulltime?: number
  num_employees_parttime?: number
  business_stage?: "pre-revenue" | "early" | "growth" | "mature"
  business_model_description?: string
  main_products_services?: string
  revenue_last_3_months?: number
  monthly_expenses?: number
  profit_margin?: number
  bank_balance?: number
  outstanding_debts?: number
  customer_base_size?: number
  cac?: number
  ltv?: number
  monthly_growth_rate?: number
  market_share?: string
  partnerships?: string

  // Funding & Support
  funding_amount_requested: number
  fund_allocation?: {
    marketing?: number
    operations?: number
    product_dev?: number
    salaries?: number
    other?: number
  }
  funding_type?: string
  investor_type_seeking?: string[]
  support_needed?: string[]
  expected_milestones?: string
  how_heard?: string

  // Team (Active Business)
  team_members?: Array<{
    name: string
    position: string
    ownership_percentage: number
    salary: number
    years_with_company: number
  }>

  // Investor Specific
  investment_preferences?: {
    industries?: string[]
    stage?: string[]
    ticket_size_min?: number
    ticket_size_max?: number
    geography?: string
    investment_types?: string[]
  }
  years_investing?: number
  num_investments?: number
  investment_philosophy?: string
  kyc_aml_status?: string
  preferred_communication?: string

  agreed_to_terms: boolean
  agreed_to_fee: boolean
  agreed_to_confidentiality: boolean
  digital_signature?: string
  signature_date?: Date

  // Status
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected"
  rejection_reason?: string

  created_at: Date
  updated_at: Date
}

const intakeSubmissionSchema = new Schema<IIntakeSubmission>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    form_type: { type: String, enum: ["ideation", "active_business", "investor"], required: true },
    full_name: { type: String, required: true },
    country: { type: String, required: true },
    national_id: { type: String },
    date_of_birth: { type: String },
    gender: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    physical_address: { type: String },
    marital_status: { type: String },
    dependents: { type: Number },

    current_employment: {
      position: String,
      company: String,
      salary: Number,
      start_date: String,
    },
    previous_employment: [
      {
        position: String,
        company: String,
        dates: String,
      },
    ],
    education: {
      degree: String,
      institution: String,
      year: Number,
      field: String,
    },
    current_occupation: { type: String },
    work_experience: { type: String },
    education_level: { type: String },
    entrepreneurial_exp: { type: String },
    why_right_person: { type: String },

    business_name: { type: String },
    trading_name: { type: String },
    tagline: { type: String },
    registration_number: { type: String },
    date_of_incorporation: { type: String },
    industry: { type: String },
    website: { type: String },
    business_address: { type: String },
    business_contacts: { type: String },

    idea_description: { type: String },
    problem_solved: { type: String },
    target_customers: { type: String },
    market_size_estimate: { type: String },
    competitors: [String],
    unique_value_proposition: { type: String },
    why_now: { type: String },
    marketing_channels: [String],
    market_research_done: { type: Boolean },
    market_research_description: { type: String },
    customer_interviews_done: { type: Boolean },
    customer_interviews_feedback: { type: String },

    num_employees_fulltime: { type: Number },
    num_employees_parttime: { type: Number },
    business_stage: { type: String, enum: ["pre-revenue", "early", "growth", "mature"] },
    business_model_description: { type: String },
    main_products_services: { type: String },
    revenue_last_3_months: { type: Number },
    monthly_expenses: { type: Number },
    profit_margin: { type: Number },
    bank_balance: { type: Number },
    outstanding_debts: { type: Number },
    customer_base_size: { type: Number },
    cac: { type: Number },
    ltv: { type: Number },
    monthly_growth_rate: { type: Number },
    market_share: { type: String },
    partnerships: { type: String },

    funding_amount_requested: { type: Number, required: true },
    fund_allocation: {
      marketing: Number,
      operations: Number,
      product_dev: Number,
      salaries: Number,
      other: Number,
    },
    funding_type: { type: String },
    investor_type_seeking: [String],
    support_needed: [String],
    expected_milestones: { type: String },
    how_heard: { type: String },

    team_members: [
      {
        name: String,
        position: String,
        ownership_percentage: Number,
        salary: Number,
        years_with_company: Number,
      },
    ],

    investment_preferences: {
      industries: [String],
      stage: [String],
      ticket_size_min: Number,
      ticket_size_max: Number,
      geography: String,
      investment_types: [String],
    },
    years_investing: { type: Number },
    num_investments: { type: Number },
    investment_philosophy: { type: String },
    kyc_aml_status: { type: String },
    preferred_communication: { type: String },

    agreed_to_terms: { type: Boolean, default: false },
    agreed_to_fee: { type: Boolean, default: false },
    agreed_to_confidentiality: { type: Boolean, default: false },
    digital_signature: { type: String },
    signature_date: { type: Date },

    status: { type: String, enum: ["draft", "submitted", "under_review", "approved", "rejected"], default: "draft" },
    rejection_reason: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

intakeSubmissionSchema.index({ user_id: 1, form_type: 1 })
intakeSubmissionSchema.index({ status: 1, created_at: -1 })

const IntakeSubmission = mongoose.model<IIntakeSubmission>("IntakeSubmission", intakeSubmissionSchema)
export default IntakeSubmission
