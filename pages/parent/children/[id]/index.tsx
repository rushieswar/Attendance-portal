/**
 * Parent - View Child Details (Attendance & Performance)
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../../layout/PageWrapper/PageWrapper';
import Page from '../../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../../layout/SubHeader/SubHeader';
import Button from '../../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../../components/bootstrap/Card';
import { useAuth } from '../../../../lib/auth/useAuth';
import { UserRole, Student, AttendanceStatus } from '../../../../lib/types/database';
import { supabase } from '../../../../lib/supabase/client';
import showNotification from '../../../../components/extras/showNotification';

interface AttendanceRecord {
	id: string;
	date: string;
	status: AttendanceStatus;
}

interface GradeRecord {
	id: string;
	marks_obtained: number;
	assessment: {
		name: string;
		max_marks: number;
		assessment_date: string;
	};
	subject: {
		name: string;
		code: string;
	};
}

const ChildDetailsPage: NextPage = () => {
	const router = useRouter();
	const { id: studentId } = router.query;
	const { user, role, loading } = useAuth();
	const [student, setStudent] = useState<Student | null>(null);
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
	const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [activeTab, setActiveTab] = useState<'attendance' | 'grades'>('attendance');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.PARENT)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch student details
	useEffect(() => {
		const fetchData = async () => {
			if (!studentId || typeof studentId !== 'string' || !user) return;
			try {
				// Fetch student
				const { data: studentData, error: studentError } = await supabase
					.from('students')
					.select('*')
					.eq('id', studentId)
					.eq('parent_id', user.id)
					.single();

				if (studentError) throw studentError;
				setStudent(studentData);

				// Fetch attendance records (last 30 days)
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				const { data: attendanceData, error: attendanceError } = await supabase
					.from('attendance_records')
					.select('id, date, status')
					.eq('student_id', studentId)
					.gte('date', thirtyDaysAgo.toISOString().split('T')[0])
					.order('date', { ascending: false });

				if (attendanceError) throw attendanceError;
				setAttendanceRecords(attendanceData || []);

				// Fetch grades
				const { data: gradesData, error: gradesError } = await supabase
					.from('grades')
					.select(`
						id,
						marks_obtained,
						assessment:assessments(name, max_marks, assessment_date),
						subject:subjects(name, code)
					`)
					.eq('student_id', studentId)
					.order('created_at', { ascending: false });

				if (gradesError) throw gradesError;
				setGradeRecords(gradesData || []);
			} catch (error) {
				console.error('Error fetching data:', error);
				showNotification('Error', 'Failed to load data', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchData();
	}, [studentId, user]);

	// Calculate attendance statistics
	const calculateAttendanceStats = () => {
		const total = attendanceRecords.length;
		const present = attendanceRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
		const absent = attendanceRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
		const late = attendanceRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
		const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
		return { total, present, absent, late, percentage };
	};

	// Calculate average marks
	const calculateAverageMarks = () => {
		if (gradeRecords.length === 0) return '0';
		const totalPercentage = gradeRecords.reduce((sum, grade) => {
			const percentage = (grade.marks_obtained / grade.assessment.max_marks) * 100;
			return sum + percentage;
		}, 0);
		return (totalPercentage / gradeRecords.length).toFixed(1);
	};

	if (loading || !user || role !== UserRole.PARENT) return null;

	const attendanceStats = calculateAttendanceStats();
	const averageMarks = calculateAverageMarks();

	return (
		<PageWrapper>
			<Head>
				<title>{student?.full_name || 'Child Details'} - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/parent/children')}>
						Back to Children
					</Button>
					<span className='h4 mb-0 fw-bold'>{student?.full_name || 'Loading...'}</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				{loadingData ? (
					<div className='text-center py-5'>Loading...</div>
				) : !student ? (
					<div className='text-center py-5 text-muted'>Student not found</div>
				) : (
					<>
						{/* Statistics Cards */}
						<div className='row mb-4'>
							<div className='col-md-6 col-lg-3'>
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
												<div className='text-muted small'>Attendance Rate</div>
												<div className='fw-bold h4 mb-0'>{attendanceStats.percentage}%</div>
											</div>
										</div>
									</CardBody>
								</Card>
							</div>
							<div className='col-md-6 col-lg-3'>
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
														className='bi bi-trophy'
														viewBox='0 0 16 16'>
														<path d='M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z' />
													</svg>
												</div>
											</div>
											<div className='flex-grow-1 ms-3'>
												<div className='text-muted small'>Average Score</div>
												<div className='fw-bold h4 mb-0'>{averageMarks}%</div>
											</div>
										</div>
									</CardBody>
								</Card>
							</div>
							<div className='col-md-6 col-lg-3'>
								<Card>
									<CardBody>
										<div className='d-flex align-items-center'>
											<div className='flex-shrink-0'>
												<div className='bg-l10-warning text-warning rounded-2 p-3'>
													<svg
														xmlns='http://www.w3.org/2000/svg'
														width='32'
														height='32'
														fill='currentColor'
														className='bi bi-calendar-check'
														viewBox='0 0 16 16'>
														<path d='M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z' />
														<path d='M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z' />
													</svg>
												</div>
											</div>
											<div className='flex-grow-1 ms-3'>
												<div className='text-muted small'>Days Present</div>
												<div className='fw-bold h4 mb-0'>{attendanceStats.present}</div>
											</div>
										</div>
									</CardBody>
								</Card>
							</div>
							<div className='col-md-6 col-lg-3'>
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
														className='bi bi-file-earmark-text'
														viewBox='0 0 16 16'>
														<path d='M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z' />
														<path d='M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z' />
													</svg>
												</div>
											</div>
											<div className='flex-grow-1 ms-3'>
												<div className='text-muted small'>Total Assessments</div>
												<div className='fw-bold h4 mb-0'>{gradeRecords.length}</div>
											</div>
										</div>
									</CardBody>
								</Card>
							</div>
						</div>

						{/* Tabs */}
						<div className='row'>
							<div className='col-12'>
								<Card>
									<CardHeader>
										<ul className='nav nav-tabs' role='tablist'>
											<li className='nav-item' role='presentation'>
												<button
													className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
													onClick={() => setActiveTab('attendance')}
													type='button'
													role='tab'>
													Attendance Records
												</button>
											</li>
											<li className='nav-item' role='presentation'>
												<button
													className={`nav-link ${activeTab === 'grades' ? 'active' : ''}`}
													onClick={() => setActiveTab('grades')}
													type='button'
													role='tab'>
													Academic Performance
												</button>
											</li>
										</ul>
									</CardHeader>
									<CardBody className='table-responsive'>
										{activeTab === 'attendance' ? (
											attendanceRecords.length === 0 ? (
												<div className='text-center py-5 text-muted'>No attendance records found</div>
											) : (
												<table className='table table-modern table-hover'>
													<thead>
														<tr>
															<th>Date</th>
															<th>Status</th>
														</tr>
													</thead>
													<tbody>
														{attendanceRecords.map((record) => (
															<tr key={record.id}>
																<td>{new Date(record.date).toLocaleDateString()}</td>
																<td>
																	{record.status === AttendanceStatus.PRESENT && (
																		<span className='badge bg-success'>Present</span>
																	)}
																	{record.status === AttendanceStatus.ABSENT && (
																		<span className='badge bg-danger'>Absent</span>
																	)}
																	{record.status === AttendanceStatus.LATE && (
																		<span className='badge bg-warning'>Late</span>
																	)}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											)
										) : gradeRecords.length === 0 ? (
											<div className='text-center py-5 text-muted'>No grades found</div>
										) : (
											<table className='table table-modern table-hover'>
												<thead>
													<tr>
														<th>Assessment</th>
														<th>Subject</th>
														<th>Date</th>
														<th>Marks</th>
														<th>Percentage</th>
													</tr>
												</thead>
												<tbody>
													{gradeRecords.map((grade) => {
														const percentage = (
															(grade.marks_obtained / grade.assessment.max_marks) *
															100
														).toFixed(1);
														return (
															<tr key={grade.id}>
																<td>{grade.assessment.name}</td>
																<td>
																	{grade.subject.name} ({grade.subject.code})
																</td>
																<td>
																	{grade.assessment.assessment_date
																		? new Date(grade.assessment.assessment_date).toLocaleDateString()
																		: '-'}
																</td>
																<td>
																	{grade.marks_obtained} / {grade.assessment.max_marks}
																</td>
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
										)}
									</CardBody>
								</Card>
							</div>
						</div>
					</>
				)}
			</Page>
		</PageWrapper>
	);
};

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking',
	};
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default ChildDetailsPage;


