import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetQuizByIdQuery,
  useCreateQuizMutation,
  useUpdateQuizMutation,
  usePublishQuizMutation,
  useGetQuestionsQuery,
  useAddQuestionMutation,
  useEditQuestionMutation,
  useDeleteQuestionMutation,
  useBulkImportQuestionsMutation,
  useGetParticipantsQuery,
  useAddParticipantsMutation,
  useRemoveParticipantMutation,
} from '../../services/api';
import {
  Tabs, Card, Form, Input, Button, Select, DatePicker, message, Row, Col, Typography,
  Table, Space, Modal, Checkbox, Alert, Popconfirm, Upload
} from 'antd';
import Icon from '../../components/ui/Icon/Icon';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const QuizEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');

  const { data: quizResponse, isLoading: quizLoading, refetch: refetchQuiz } = useGetQuizByIdQuery(id || '', { skip: !isEditMode });
  const quiz = quizResponse?.data;

  const [createQuiz, { isLoading: isCreating }] = useCreateQuizMutation();
  const [updateQuiz, { isLoading: isUpdating }] = useUpdateQuizMutation();
  const [publishQuiz, { isLoading: isPublishing }] = usePublishQuizMutation();

  const handleSaveDetails = async (values: any) => {
    const payload = {
      ...values,
      startTime: values.startTime ? values.startTime.toISOString() : null,
      endTime: values.endTime ? values.endTime.toISOString() : null,
    };

    try {
      if (isEditMode && id) {
        await updateQuiz({ id, body: payload }).unwrap();
        message.success('Quiz details updated successfully');
        refetchQuiz();
      } else {
        const res = await createQuiz(payload).unwrap();
        message.success('Quiz created successfully');
        navigate(`/quizzes/${res.data._id}/edit`);
      }
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to save quiz details');
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishQuiz(id).unwrap();
      message.success('Quiz published and scheduled successfully');
      refetchQuiz();
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to publish quiz');
    }
  };

  if (isEditMode && quizLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
        <Text>Loading editor...</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>
            {isEditMode ? `Edit Quiz: ${quiz?.title}` : 'Create New Quiz'}
          </Title>
          <Text type="secondary">
            {isEditMode ? 'Configure settings, add questions, enroll participants, and schedule testing window' : 'Set basic details to begin your draft'}
          </Text>
        </div>
        <Button onClick={() => navigate('/quizzes')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="arrow-left" size={14} /> Back to List
        </Button>
      </div>

      {isEditMode && quiz && (
        <div style={{ marginBottom: '20px' }}>
          {quiz.status === 'Draft' && (
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>
                    <strong>Status: Draft.</strong> To schedule and publish this quiz, you must add at least <strong>1 question</strong> and <strong>1 participant</strong>.
                  </span>
                  {quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 && quiz.startTime && (
                    <Button type="primary" size="small" onClick={handlePublish} loading={isPublishing} style={{ backgroundColor: 'var(--secondary-2)', borderColor: 'var(--secondary-2)' }}>
                      Publish Quiz
                    </Button>
                  )}
                </div>
              }
              type={quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 ? 'success' : 'warning'}
              showIcon
            />
          )}
          {quiz.status === 'Scheduled' && (
            <Alert
              message="Status: Scheduled. Edits only take effect once you click Re-publish."
              type="info"
              showIcon
              action={
                <Button size="small" type="primary" onClick={handlePublish} loading={isPublishing} style={{ backgroundColor: 'var(--tertiary-2)', borderColor: 'var(--tertiary-2)' }}>
                  Re-publish
                </Button>
              }
            />
          )}
          {quiz.status === 'Live' && (
            <Alert message="Status: Live. Assessment is currently active." type="success" showIcon />
          )}
        </div>
      )}

      {isEditMode ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}
          items={[
            {
              key: 'details',
              label: 'Quiz Settings',
              children: <DetailsTab quiz={quiz} onSave={handleSaveDetails} isSaving={isUpdating} />,
            },
            {
              key: 'questions',
              label: 'Questions',
              children: <QuestionsTab quizId={id || ''} questionType={quiz?.questionType} />,
            },
            {
              key: 'participants',
              label: 'Participants',
              children: <ParticipantsTab quizId={id || ''} />,
            },
          ]}
        />
      ) : (
        <Card style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <DetailsTab onSave={handleSaveDetails} isSaving={isCreating} />
        </Card>
      )}
    </div>
  );
};

// --- SUB-COMPONENT: DETAILS TAB ---
const DetailsTab: React.FC<{ quiz?: any; onSave: (values: any) => void; isSaving: boolean }> = ({ quiz, onSave, isSaving }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (quiz) {
      form.setFieldsValue({
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        questionType: quiz.questionType,
        startTime: quiz.startTime ? dayjs(quiz.startTime) : null,
        endTime: quiz.endTime ? dayjs(quiz.endTime) : null,
      });
    }
  }, [quiz, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onSave} requiredMark={false} initialValues={{ questionType: 'single' }}>
      <Row gutter={24}>
        <Col xs={24} md={16}>
          <Form.Item name="title" label={<span style={{ fontWeight: 600 }}>Quiz Title</span>} rules={[{ required: true, message: 'Please enter quiz title' }]}>
            <Input placeholder="e.g. CSS Advanced Selectors" />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Description</span>}>
            <TextArea rows={4} placeholder="Summarize the assessment scope..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="duration" label={<span style={{ fontWeight: 600 }}>Duration (Minutes)</span>} rules={[{ required: true, message: 'Please enter duration' }]}>
            <Input type="number" min={1} placeholder="30" suffix="mins" />
          </Form.Item>
          <Form.Item name="questionType" label={<span style={{ fontWeight: 600 }}>Selection Type</span>} rules={[{ required: true }]}>
            <Select options={[{ value: 'single', label: 'Single Choice (MCQ)' }, { value: 'multi', label: 'Multi-Select Choice' }]} />
          </Form.Item>
          <Form.Item name="startTime" label={<span style={{ fontWeight: 600 }}>Start Time Window</span>}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="Select start date & time" />
          </Form.Item>
          <Form.Item name="endTime" label={<span style={{ fontWeight: 600 }}>End Time Window</span>}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} placeholder="Select end date & time" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item style={{ marginTop: '16px' }}>
        <Button type="primary" htmlType="submit" loading={isSaving} style={{ backgroundColor: 'var(--primary-2)', borderColor: 'var(--primary-2)' }}>
          Save Configuration
        </Button>
      </Form.Item>
    </Form>
  );
};

// --- SUB-COMPONENT: QUESTIONS TAB ---
const QuestionsTab: React.FC<{ quizId: string; questionType?: string }> = ({ quizId }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [csvContent, setCsvContent] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  const { data: questionsResponse, isLoading, refetch } = useGetQuestionsQuery(quizId);
  const [addQuestion, { isLoading: isAdding }] = useAddQuestionMutation();
  const [editQuestion, { isLoading: isEditing }] = useEditQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [bulkImport, { isLoading: isBulkLoading }] = useBulkImportQuestionsMutation();

  const questions = questionsResponse?.data || [];
  const [form] = Form.useForm();

  const handleOpenModal = (q?: any) => {
    setSelectedQuestion(q || null);
    if (q) {
      form.setFieldsValue({
        question: q.question,
        optionA: q.options[0],
        optionB: q.options[1],
        optionC: q.options[2],
        optionD: q.options[3],
        correctAnswers: q.correctAnswers,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSaveQuestion = async (values: any) => {
    const payload = {
      quizId,
      question: values.question,
      options: [values.optionA, values.optionB, values.optionC, values.optionD],
      correctAnswers: values.correctAnswers,
    };

    try {
      if (selectedQuestion) {
        await editQuestion({ id: selectedQuestion._id, body: payload }).unwrap();
        message.success('Question updated successfully');
      } else {
        await addQuestion(payload).unwrap();
        message.success('Question added successfully');
      }
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id).unwrap();
      message.success('Question deleted');
      refetch();
    } catch (err: any) {
      message.error('Failed to delete question');
    }
  };

  // CSV Drag and drop file reading
  const handleCSVParse = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const parsedQuestions: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle comma splitting with simple quote escape
        const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
        if (parts.length < 6) continue;

        const questionText = parts[0].replace(/^"|"$/g, '');
        const options = parts.slice(1, 5).map(o => o.replace(/^"|"$/g, '').trim());
        const ansString = parts[5].replace(/^"|"$/g, '').trim();

        // Convert letters (A-D) or numbers (0-3) to correct indices array
        const correctAnswers: number[] = [];
        const ansTokens = ansString.split(/[;|]/); // Support pipe or semicolon separated indices
        ansTokens.forEach(t => {
          const val = t.toUpperCase().trim();
          if (val === 'A') correctAnswers.push(0);
          else if (val === 'B') correctAnswers.push(1);
          else if (val === 'C') correctAnswers.push(2);
          else if (val === 'D') correctAnswers.push(3);
          else if (!isNaN(Number(val))) correctAnswers.push(Number(val));
        });

        if (correctAnswers.length > 0) {
          parsedQuestions.push({
            question: questionText,
            options,
            correctAnswers,
          });
        }
      }
      setCsvContent(parsedQuestions);
      message.success(`Successfully parsed ${parsedQuestions.length} questions from CSV`);
    };
    reader.readAsText(file);
    return false; // Prevent auto upload
  };

  const handleImportCSV = async () => {
    if (csvContent.length === 0) return;
    try {
      await bulkImport({ quizId, questions: csvContent }).unwrap();
      message.success(`Staged ${csvContent.length} questions imported successfully`);
      setCsvModalVisible(false);
      setCsvContent([]);
      setCsvFileName('');
      refetch();
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to import CSV');
    }
  };

  const columns = [
    {
      title: 'Question text',
      dataIndex: 'question',
      key: 'question',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Options list',
      key: 'options',
      render: (record: any) => (
        <ol style={{ paddingLeft: '20px', fontSize: '12px' }}>
          {record.options.map((opt: string, idx: number) => {
            const isCorrect = record.correctAnswers.includes(idx);
            return (
              <li key={idx} style={{ color: isCorrect ? 'var(--color-success)' : 'inherit', fontWeight: isCorrect ? 600 : 'normal' }}>
                {opt} {isCorrect && '✓'}
              </li>
            );
          })}
        </ol>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button size="small" onClick={() => handleOpenModal(record)}>Edit</Button>
          <Popconfirm title="Delete question?" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger type="text">Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Text style={{ fontWeight: 600 }}>Assessments Questions List ({questions.length})</Text>
        <Space>
          <Button type="dashed" icon={<Icon name="upload" size={14} />} onClick={() => setCsvModalVisible(true)}>
            Import CSV File
          </Button>
          <Button type="primary" icon={<Icon name="plus" size={14} />} onClick={() => handleOpenModal()} style={{ backgroundColor: 'var(--primary-2)', borderColor: 'var(--primary-2)' }}>
            Add Question
          </Button>
        </Space>
      </div>

      <Table dataSource={questions} columns={columns} rowKey="_id" loading={isLoading} pagination={false} size="middle" />

      {/* Manual Add/Edit Question Modal */}
      <Modal
        title={selectedQuestion ? 'Edit Question' : 'Add Question'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={isAdding || isEditing}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSaveQuestion} requiredMark={false}>
          <Form.Item name="question" label="Question Text" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Enter your question here..." />
          </Form.Item>
          
          <Row gutter={12}>
            {['optionA', 'optionB', 'optionC', 'optionD'].map((optName, idx) => (
              <Col span={12} key={idx}>
                <Form.Item name={optName} label={`Option ${String.fromCharCode(65 + idx)}`} rules={[{ required: true }]}>
                  <Input placeholder={`Option value`} />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item name="correctAnswers" label="Correct Options (Select one or more)" rules={[{ required: true, message: 'Please select correct answer' }]}>
            <Checkbox.Group style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <Checkbox value={0}>Option A</Checkbox>
              <Checkbox value={1}>Option B</Checkbox>
              <Checkbox value={2}>Option C</Checkbox>
              <Checkbox value={3}>Option D</Checkbox>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title="Upload CSV Questions"
        open={csvModalVisible}
        onCancel={() => setCsvModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCsvModalVisible(false)}>Cancel</Button>,
          <Button key="import" type="primary" disabled={csvContent.length === 0} loading={isBulkLoading} onClick={handleImportCSV} style={{ backgroundColor: 'var(--primary-2)', borderColor: 'var(--primary-2)' }}>
            Import {csvContent.length > 0 ? csvContent.length : ''} Questions
          </Button>
        ]}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          <Upload.Dragger beforeUpload={handleCSVParse} maxCount={1} showUploadList={false} accept=".csv">
            <p className="ant-upload-drag-icon" style={{ color: 'var(--primary-2)' }}>
              <Icon name="upload" size={40} />
            </p>
            <p className="ant-upload-text">Drag & drop your questions CSV file here, or click to browse</p>
            <p className="ant-upload-hint" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Supported columns: <strong>question, optionA, optionB, optionC, optionD, correctAnswer</strong> (letters or index values)
            </p>
          </Upload.Dragger>

          {csvFileName && (
            <div style={{ marginTop: '16px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <Text strong style={{ fontSize: '12px' }}>Staged File: </Text>
              <Text style={{ fontSize: '12px' }}>{csvFileName} ({csvContent.length} questions detected)</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

// --- SUB-COMPONENT: PARTICIPANTS TAB ---
const ParticipantsTab: React.FC<{ quizId: string }> = ({ quizId }) => {
  const [emailInput, setEmailInput] = useState('');
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  const { data: participantsResponse, isLoading, refetch } = useGetParticipantsQuery(quizId);
  const [addParticipants, { isLoading: isAdding }] = useAddParticipantsMutation();
  const [removeParticipant] = useRemoveParticipantMutation();

  const participants = participantsResponse?.data || [];

  const handleAddInline = async () => {
    if (!emailInput) return;
    try {
      const res = await addParticipants({ quizId, emails: [emailInput] }).unwrap();
      if (res.data.importedCount > 0) {
        message.success(`${emailInput} assigned successfully`);
        setEmailInput('');
        refetch();
      } else {
        message.warning(`Email not assigned. Is the email registered as candidate?`);
      }
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to add participant');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeParticipant(id).unwrap();
      message.success('Participant removed');
      refetch();
    } catch (err) {
      message.error('Failed to remove participant');
    }
  };

  const handleCSVParse = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const emails: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Simple extraction: check for @ and trim
        if (line.includes('@')) {
          emails.push(line.replace(/^"|"$/g, '').trim());
        }
      }
      // Remove header if contains 'email'
      const filtered = emails.filter(email => email.toLowerCase() !== 'email');
      setCsvEmails(filtered);
      message.success(`Found ${filtered.length} email addresses in CSV`);
    };
    reader.readAsText(file);
    return false;
  };

  const handleImportCSV = async () => {
    if (csvEmails.length === 0) return;
    try {
      const res = await addParticipants({ quizId, emails: csvEmails }).unwrap();
      message.success(`Successfully imported ${res.data.importedCount} participants. (${res.data.unregisteredCount} unregistered emails ignored)`);
      setCsvModalVisible(false);
      setCsvEmails([]);
      setCsvFileName('');
      refetch();
    } catch (err: any) {
      message.error('Failed to import CSV');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: ['userId', 'name'],
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Email Address',
      dataIndex: ['userId', 'email'],
      key: 'email',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Popconfirm title="Remove participant from quiz?" onConfirm={() => handleRemove(record._id)}>
          <Button size="small" danger type="text">Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
        <Text style={{ fontWeight: 600 }}>Assigned Candidates List ({participants.length})</Text>
        <Button type="dashed" icon={<Icon name="upload" size={14} />} onClick={() => setCsvModalVisible(true)}>
          Import Participants CSV
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', maxWidth: '500px' }}>
        <Input
          placeholder="Enter candidate email (e.g. sara@company.com)"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onPressEnter={handleAddInline}
          style={{ borderRadius: '6px' }}
        />
        <Button type="primary" onClick={handleAddInline} loading={isAdding} style={{ backgroundColor: 'var(--primary-2)', borderColor: 'var(--primary-2)' }}>
          Assign
        </Button>
      </div>

      <Table dataSource={participants} columns={columns} rowKey="_id" loading={isLoading} pagination={{ pageSize: 5 }} size="middle" />

      {/* CSV upload modal */}
      <Modal
        title="Upload Participants CSV"
        open={csvModalVisible}
        onCancel={() => setCsvModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCsvModalVisible(false)}>Cancel</Button>,
          <Button key="import" type="primary" disabled={csvEmails.length === 0} loading={isAdding} onClick={handleImportCSV} style={{ backgroundColor: 'var(--primary-2)', borderColor: 'var(--primary-2)' }}>
            Import {csvEmails.length > 0 ? csvEmails.length : ''} Candidates
          </Button>
        ]}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          <Upload.Dragger beforeUpload={handleCSVParse} maxCount={1} showUploadList={false} accept=".csv">
            <p className="ant-upload-drag-icon" style={{ color: 'var(--primary-2)' }}>
              <Icon name="upload" size={40} />
            </p>
            <p className="ant-upload-text">Drag & drop your participants CSV here, or click to browse</p>
            <p className="ant-upload-hint" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              File should contain a list of email addresses, one per line (with optional <strong>email</strong> header)
            </p>
          </Upload.Dragger>

          {csvFileName && (
            <div style={{ marginTop: '16px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <Text strong style={{ fontSize: '12px' }}>Staged File: </Text>
              <Text style={{ fontSize: '12px' }}>{csvFileName} ({csvEmails.length} emails detected)</Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default QuizEditor;

