/**
 * Admin - Academic Reports
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Select from '../../../components/bootstrap/forms/Select';
import Input from '../../../components/bootstrap/forms/Input';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, Class, Assessment } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface GradeRecord {
	id: string;
	marks_obtained: number;
	student: {
		id: string;
		full_name: string;
		admission_number: string;
	};
	assessment: {
		id: string;
		name: string;
		max_marks: number;
	};
	subject: {
		id: string;
		name: string;
		code: string;
	};
}

const AcademicReportsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [classes, setClasses] = useState<Class[]>([]);
	const [assessments, setAssessments] = useState<Assessment[]>([]);
	const [selectedClassId, setSelectedClassId] = useState('');
	const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
	const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch classes
	useEffect(() => {
		const fetchClasses = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('classes')
					.select('*')
					.order('grade_level', { ascending: true });

				if (error) throw error;
				setClasses(data || []);
			} catch (error) {
				console.error('Error fetching classes:', error);
			}
		};
		fetchClasses();
	}, [user]);

	// Fetch assessments
	useEffect(() => {
		const fetchAssessments = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('assessments')
					.select('*')
					.order('assessment_date', { ascending: false });

				if (error) throw error;
				setAssessments(data || []);
			} catch (error) {
				console.error('Error fetching assessments:', error);
			}
		};
		fetchAssessments();
	}, [user]);

	const handleGenerateReport = async () => {
		if (!selectedClassId || !selectedAssessmentId) {
			showNotification('Validation Error', 'Please select class and assessment', 'warning');
			return;
		}

		setLoadingData(true);
		try {
			const { data, error } = await supabase
				.from('grades')
				.select(`
					id,
					marks_obtained,
					student:students(id, full_name, admission_number),
					assessment:assessments(id, name, max_marks),
					subject:subjects(id, name, code)
				`)
				.eq('class_id', selectedClassId)
				.eq('assessment_id', selectedAssessmentId)
				.order('marks_obtained', { ascending: false });

			if (error) throw error;
			setGradeRecords(data || []);
			showNotification('Success', 'Report generated successfully', 'success');
		} catch (error) {
			console.error('Error generating report:', error);
			showNotification('Error', 'Failed to generate report', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	const handleExportToCSV = () => {
		if (gradeRecords.length === 0) {
			showNotification('No Data', 'No records to export', 'warning');
			return;
		}

		const headers = ['Admission Number', 'Student Name', 'Subject', 'Marks Obtained', 'Max Marks', 'Percentage'];
		const csvData = gradeRecords.map((record) => [
			record.student.admission_number,
			record.student.full_name,
			`${record.subject.name} (${record.subject.code})`,
			record.marks_obtained,
			record.assessment.max_marks,
			((record.marks_obtained / record.assessment.max_marks) * 100).toFixed(2) + '%',
		]);

		const csvContent = [
			headers.join(','),
			...csvData.map((row) => row.join(',')),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `academic_report_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		showNotification('Success', 'Report exported successfully', 'success');
	};

	// Filter records by search term
	const filteredRecords = gradeRecords.filter((record) =>
		record.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		record.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Calculate statistics
	const stats = {
		total: filteredRecords.length,
		averageMarks: filteredRecords.length > 0
			? (filteredRecords.reduce((sum, r) => sum + (r.marks_obtained / r.assessment.max_marks) * 100, 0) / filteredRecords.length).toFixed(2)
			: '0',
		passed: filteredRecords.filter((r) => (r.marks_obtained / r.assessment.max_marks) * 100 >= 50).length,
		failed: filteredRecords.filter((r) => (r.marks_obtained / r.assessment.max_marks) * 100 < 50).length,
	};

	if (loading || !user || role !== UserRole.TEACHER) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Academic Reports - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Academic Reports</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{gradeRecords.length > 0 && (
						<Button color='success' icon='Download' onClick={handleExportToCSV}>
							Export to CSV
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				{/* Filters */}
				<div className='row mb-4'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='FilterAlt'>
									<CardTitle>Report Filters</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='row g-3'>
									<div className='col-md-4'>
										<FormGroup id='classId' label='Class'>
											<Select
												ariaLabel='Select Class'
												value={selectedClassId}
												onChange={(e: any) => setSelectedClassId(e.target.value)}>
												<option value=''>Select Class</option>
												{classes.map((cls) => (
													<option key={cls.id} value={cls.id}>
														Grade {cls.grade_level} - {cls.section}
													</option>
												))}
											</Select>
										</FormGroup>
									</div>
									<div className='col-md-4'>
										<FormGroup id='assessmentId' label='Assessment'>
											<Select
												ariaLabel='Select Assessment'
												value={selectedAssessmentId}
												onChange={(e: any) => setSelectedAssessmentId(e.target.value)}>
												<option value=''>Select Assessment</option>
												{assessments.map((assessment) => (
													<option key={assessment.id} value={assessment.id}>
														{assessment.name}
													</option>
												))}
											</Select>
										</FormGroup>
									</div>
									<div className='col-md-4 d-flex align-items-end'>
										<Button
											color='primary'
											icon='Assessment'
											className='w-100'
											onClick={handleGenerateReport}
											isDisable={loadingData}>
											{loadingData ? 'Generating...' : 'Generate Report'}
										</Button>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Statistics */}
				{gradeRecords.length > 0 && (
					<div className='row mb-4'>
						<div className='col-md-3'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-center'>
										<div className='flex-shrink-0'>
											<div className='bg-l10-info text-info rounded-2 p-3'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='32'
													height='32'
													fill='currentColor'
													className='bi bi-people'
													viewBox='0 0 16 16'>
													<path d='M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' />
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Total Students</div>
											<div className='fw-bold h4 mb-0'>{stats.total}</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>
						<div className='col-md-3'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-center'>
										<div className='flex-shrink-0'>
											<div className='bg-l10-primary text-primary rounded-2 p-3'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='32'
													height='32'
													fill='currentColor'
													className='bi bi-graph-up'
													viewBox='0 0 16 16'>
													<path
														fillRule='evenodd'
														d='M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z'
													/>
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Average Score</div>
											<div className='fw-bold h4 mb-0'>{stats.averageMarks}%</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>
						<div className='col-md-3'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-center'>
										<div className='flex-shrink-0'>
											<div className='bg-l10-success text-success rounded-2 p-3'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='32'
													height='32'
													fill='currentColor'
													className='bi bi-check-circle'
													viewBox='0 0 16 16'>
													<path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z' />
													<path d='M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z' />
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Passed (≥50%)</div>
											<div className='fw-bold h4 mb-0'>{stats.passed}</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>
						<div className='col-md-3'>
							<Card>
								<CardBody>
									<div className='d-flex align-items-center'>
										<div className='flex-shrink-0'>
											<div className='bg-l10-danger text-danger rounded-2 p-3'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='32'
													height='32'
													fill='currentColor'
													className='bi bi-x-circle'
													viewBox='0 0 16 16'>
													<path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z' />
													<path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z' />
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Failed (&lt;50%)</div>
											<div className='fw-bold h4 mb-0'>{stats.failed}</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>
					</div>
				)}

				{/* Records Table */}
				{gradeRecords.length > 0 && (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardHeader>
									<CardLabel icon='TableChart'>
										<CardTitle>Grade Records</CardTitle>
									</CardLabel>
									<div className='col-md-4'>
										<Input
											type='search'
											placeholder='Search by name or admission number...'
											value={searchTerm}
											onChange={(e: any) => setSearchTerm(e.target.value)}
										/>
									</div>
								</CardHeader>
								<CardBody className='table-responsive'>
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Admission Number</th>
												<th>Student Name</th>
												<th>Subject</th>
												<th>Marks Obtained</th>
												<th>Max Marks</th>
												<th>Percentage</th>
											</tr>
										</thead>
										<tbody>
											{filteredRecords.map((record) => {
												const percentage = (
													(record.marks_obtained / record.assessment.max_marks) *
													100
												).toFixed(1);
												return (
													<tr key={record.id}>
														<td>{record.student.admission_number}</td>
														<td>{record.student.full_name}</td>
														<td>
															{record.subject.name} ({record.subject.code})
														</td>
														<td>{record.marks_obtained}</td>
														<td>{record.assessment.max_marks}</td>
														<td>
															<span
																className={`badge ${
																	parseFloat(percentage) >= 75
																		? 'bg-success'
																		: parseFloat(percentage) >= 50
																		? 'bg-warning'
																		: 'bg-danger'
																}`}>
																{percentage}%
															</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
									{filteredRecords.length === 0 && (
										<div className='text-center py-5 text-muted'>
											No records found matching your search
										</div>
									)}
								</CardBody>
							</Card>
						</div>
					</div>
				)}
			</Page>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default AcademicReportsPage;


