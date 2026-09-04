export type Identifier = string;
export type NonEmptyText = string;

export enum ProjectLifecycleStage {
  CREATED = 'created',
  ANALYZED = 'analyzed',
  PLANNED = 'planned',
  READY_FOR_EXECUTION = 'ready_for_execution',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  FAILED = 'failed',
}

export enum ProjectStatus {
  INITIALIZED = 'initialized',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskExecutionStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  REWORK_REQUIRED = 'rework_required',
  CANCELLED = 'cancelled',
}

export enum QAVerdict {
  PASS = 'pass',
  FAIL = 'fail',
  BLOCKED = 'blocked',
}

export enum QASeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum QualityGateStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  REWORK_REQUIRED = 'rework_required',
  BLOCKED = 'blocked',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  PREPARED = 'prepared',
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
}

export enum AgentName {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  CODING = 'coding',
  QA = 'qa',
  DELIVERY = 'delivery',
}

export enum AgentResultStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REWORK_REQUIRED = 'rework_required',
}

export interface ProjectInput {
  project_description: string;
  technology_stack: string[];
}

export interface LifecycleMetadata {
  stage: ProjectLifecycleStage;
  created_at: string;
  updated_at: string;
  errors: string[];
}

export interface ImplementationTask {
  task_id: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  dependencies: string[];
  requirement_ids: string[];
  expected_artifacts: string[];
  acceptance_criteria: string[];
  status: string;
}

export interface ArtifactReference {
  artifact_id: string;
  artifact_type: string;
  location: string;
  producer: AgentName;
  task_id?: string | null;
  version: string;
}

export interface TaskExecutionState {
  task: ImplementationTask;
  status: TaskExecutionStatus;
  attempt_count: number;
  retry_count: number;
  rework_count: number;
  assigned_agent?: AgentName | null;
  generated_artifacts: ArtifactReference[];
  qa_feedback_ids: string[];
  last_error?: string | null;
}

export interface TaskTransitionRecord {
  task_id: string;
  from_status: TaskExecutionStatus;
  to_status: TaskExecutionStatus;
  reason: string;
  occurred_at: string;
  actor?: AgentName | null;
}

export interface ExecutionRecord {
  record_id: string;
  task_id: string;
  agent: AgentName;
  attempt_number: number;
  result_status: AgentResultStatus;
  started_at?: string | null;
  finished_at: string;
  artifact_ids: string[];
  errors: string[];
  transition: TaskTransitionRecord;
}

export interface QAIssue {
  issue_id: string;
  severity: QASeverity;
  affected_task_id: string;
  affected_artifact_id?: string | null;
  failure_reason: string;
  rework_required: boolean;
  suggested_remediation?: string | null;
}

export interface QAFeedback {
  feedback_id: string;
  task_id: string;
  verdict: QAVerdict;
  issues: QAIssue[];
  summary: string;
  artifact_references: ArtifactReference[];
}

export interface QAReport {
  project_id: string;
  verdict: string;
  checks: any[];
  issues: any[];
  requirement_results: any[];
  acceptance_criteria_results: any[];
  test_results: any[];
  static_analysis_results: any[];
  security_findings: any[];
  regression_results: any[];
  artifacts: ArtifactReference[];
  summary: string;
  metadata: Record<string, string>;
  generated_at: string;
}

export interface AnalysisArtifact {
  artifact_type: string;
  contract_version: string;
  generated_at: string;
  result: Record<string, unknown>; // Bound to StructuredRequirements in backend
}

export interface PlanningArtifact {
  artifact_type: string;
  contract_version: string;
  generated_at: string;
  project_id?: string | null;
  source_analysis_artifact_type: string;
  source_analysis_contract_version: string;
  result: Record<string, unknown>; // Bound to ProjectPlan in backend
}

export interface ProjectExecutionState {
  project_id: string;
  status: ProjectStatus;
  planning_artifact: PlanningArtifact;
  tasks: Record<string, TaskExecutionState>;
  generated_artifacts: ArtifactReference[];
  qa_feedback: QAFeedback[];
  execution_records: ExecutionRecord[];
  transition_history: TaskTransitionRecord[];
  iteration: number;
  created_at: string;
  updated_at: string;
}

export interface TaskQualityGate {
  task_id: string;
  status: QualityGateStatus;
  reason: string;
  report_index?: number | null;
}

export interface DeliveryResult {
  delivery_status: DeliveryStatus;
  deployment_id?: string | null;
  project_url?: string | null;
  image_references: string[];
  service_references: string[];
  metadata: Record<string, string>;
  success: boolean;
  message?: string | null;
}

export interface ProjectAggregate {
  project_id: string;
  owner_id?: string | null;
  project_input: ProjectInput;
  workspace: { project_id: string; relative_path: string };
  analysis_artifact?: AnalysisArtifact | null;
  planning_artifact?: PlanningArtifact | null;
  execution_state?: ProjectExecutionState | null;
  generated_artifacts: ArtifactReference[];
  qa_reports: QAReport[];
  quality_gates: TaskQualityGate[];
  delivery_result?: DeliveryResult | null;
  lifecycle: LifecycleMetadata;
}

export interface RuntimeEvent {
  event_type: string;
  project_id: string;
  timestamp: number;
  data: Record<string, any>;
  event_id?: string;
  message?: string;
}

