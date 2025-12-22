/**
 * Admin - Teacher Detail Page
 * Shows comprehensive teacher profile and performance metrics
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../../layout/PageWrapper/PageWrapper';
import Page from '../../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../../layout/SubHeader/SubHeader';
import Button from '../../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../../components/bootstrap/Card';
import { useAuth } from '../../../../lib/auth/useAuth';
import { UserRole } from '../../../../lib/types/database';
import { supabase } from '../../../../lib/supabase/client';
import showNotification from '../../../../components/extras/showNotification';

// Interfaces
interface TeacherData {
	id: string;
	employee_id: string;
	subjects: string[];
	joining_date: string;
	created_at: string;
	user: {
		id: string;
		full_name: string;
		phone: string | null;
		address: string | null;
		is_active: boolean;
	};
}

interface AcademicYear {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	is_current: boolean;
}

interface TeacherClass {
	id: string;
	is_class_teacher: boolean;
	class: {
		id: string;
		name: string;
		grade_level: string;
		academic_year_id: string;
	};
	subject: {
		id: string;
		name: string;
		code: string;
	} | null;
}

interface Assessment {
	id: string;
	name: string;
	max_marks: number;
	assessment_date: string | null;
	academic_year_id: string;
}

interface StudentPerformance {
	class_name: string;
	total_students: number;
	avg_performance: number;
	assessments_count: number;
}

const AdminTeacherDetailPage: NextPage = () => {
	const router = useRouter();
	const { id: teacherId } = router.query;
	const { user, role, loading } = useAuth();

	// State
	const [teacher, setTeacher] = useState<TeacherData | null>(null);
	const [teacherEmail, setTeacherEmail] = useState<string>('');
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [selectedYear, setSelectedYear] = useState<string>('all');
	const [assignedClasses, setAssignedClasses] = useState<TeacherClass[]>([]);
	const [assessments, setAssessments] = useState<Assessment[]>([]);
	const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'performance'>('overview');

	// Statistics
	const [stats, setStats] = useState({
		totalClasses: 0,
		totalStudents: 0,
		totalAssessments: 0,
		classTeacherOf: 0,
		avgStudentPerformance: 0,
	});

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch teacher details and all related data
	useEffect(() => {
		const fetchData = async () => {
			if (!teacherId || typeof teacherId !== 'string' || !user) return;
			try {
				// Fetch teacher with profile info
				const { data: teacherData, error: teacherError } = await supabase
					.from('teachers')
					.select(`
						*,
						user:profiles!teachers_user_id_fkey(
							id,
							full_name,
							phone,
							address,
							is_active
						)
					`)
					.eq('id', teacherId)
					.single();

				if (teacherError) throw teacherError;
				setTeacher(teacherData);

				// Fetch teacher's email via API route (requires service role)
				if (teacherData?.user?.id) {
					try {
						const response = await fetch(`/api/users/get-email?userId=${teacherData.user.id}`);
						if (response.ok) {
							const { email } = await response.json();
							setTeacherEmail(email || 'N/A');
						}
					} catch (err) {
						console.error('Error fetching email:', err);
						setTeacherEmail('N/A');
					}
				}

				// Fetch all academic years
				const { data: yearsData, error: yearsError } = await supabase
					.from('academic_years')
					.select('*')
					.order('start_date', { ascending: false });

				if (yearsError) throw yearsError;
				setAcademicYears(yearsData || []);

				// Set default to current academic year
				const currentYear = yearsData?.find((y) => y.is_current);
				if (currentYear) {
					setSelectedYear(currentYear.id);
				}
			} catch (error) {
				console.error('Error fetching data:', error);
				showNotification('Error', 'Failed to load teacher data', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchData();
	}, [teacherId, user]);

	// Fetch year-specific data when year changes
	useEffect(() => {
		const fetchYearData = async () => {
			if (!teacherId || typeof teacherId !== 'string' || !teacher) return;
			try {
				// Build query filter
				let classesQuery = supabase
					.from('teacher_classes')
					.select(`
						id,
						is_class_teacher,
						class:classes(
							id,
							name,
							grade_level,
							academic_year_id
						),
						subject:subjects(id, name, code)
					`)
					.eq('teacher_id', teacherId);

				// Filter by academic year if not 'all'
				if (selectedYear !== 'all') {
					// First get classes for the selected academic year
					const { data: classesInYear } = await supabase
						.from('classes')
						.select('id')
						.eq('academic_year_id', selectedYear);

					const classIds = classesInYear?.map((c) => c.id) || [];
					if (classIds.length > 0) {
						classesQuery = classesQuery.in('class_id', classIds);
					} else {
						// No classes in this year
						setAssignedClasses([]);
						setAssessments([]);
						setStudentPerformance([]);
						setStats({
							totalClasses: 0,
							totalStudents: 0,
							totalAssessments: 0,
							classTeacherOf: 0,
							avgStudentPerformance: 0,
						});
						return;
					}
				}

				const { data: classesData, error: classesError } = await classesQuery.order('is_class_teacher', {
					ascending: false,
				});

				if (classesError) throw classesError;
				setAssignedClasses(classesData || []);

				// Fetch assessments
				let assessmentsQuery = supabase
					.from('assessments')
					.select(`
						id,
						name,
						max_marks,
						assessment_date,
						academic_year_id
					`)
					.eq('created_by', teacher.user.id);

				if (selectedYear !== 'all') {
					assessmentsQuery = assessmentsQuery.eq('academic_year_id', selectedYear);
				}

				const { data: assessmentsData, error: assessmentsError } = await assessmentsQuery.order(
					'assessment_date',
					{ ascending: false }
				);

				if (assessmentsError) throw assessmentsError;
				setAssessments(assessmentsData || []);

				// Calculate statistics
				const classIds = classesData?.map((tc) => tc.class.id) || [];
				const classTeacherCount = classesData?.filter((tc) => tc.is_class_teacher).length || 0;

				// Count total students in assigned classes
				let totalStudents = 0;
				if (classIds.length > 0) {
					const { count } = await supabase
						.from('students')
						.select('id', { count: 'exact', head: true })
						.in('class_id', classIds);
					totalStudents = count || 0;
				}

				// Calculate performance by class
				const performanceByClass: StudentPerformance[] = [];
				for (const classData of classesData || []) {
					// Get assessments for this class via assessment_classes junction table
					const { data: assessmentClassData } = await supabase
						.from('assessment_classes')
						.select('assessment_id')
						.eq('class_id', classData.class.id);

					const assessmentIdsForClass = assessmentClassData?.map((ac) => ac.assessment_id) || [];

					// Filter to only assessments created by this teacher
					const classAssessments = assessmentsData?.filter((a) =>
						assessmentIdsForClass.includes(a.id)
					) || [];
					const assessmentIds = classAssessments.map((a) => a.id);

					let avgPerf = 0;
					if (assessmentIds.length > 0) {
						const { data: gradesData } = await supabase
							.from('grades')
							.select('marks_obtained, assessment:assessments(max_marks)')
							.in('assessment_id', assessmentIds);

						if (gradesData && gradesData.length > 0) {
							const totalPercentage = gradesData.reduce((sum, grade) => {
								const percentage = (grade.marks_obtained / grade.assessment.max_marks) * 100;
								return sum + percentage;
							}, 0);
							avgPerf = totalPercentage / gradesData.length;
						}
					}

					// Count students in this class
					const { count: studentCount } = await supabase
						.from('students')
						.select('id', { count: 'exact', head: true })
						.eq('class_id', classData.class.id);

					performanceByClass.push({
						class_name: classData.class.name,
						total_students: studentCount || 0,
						avg_performance: avgPerf,
						assessments_count: classAssessments.length,
					});
				}

				setStudentPerformance(performanceByClass);

				// Calculate overall average performance
				const overallAvg =
					performanceByClass.length > 0
						? performanceByClass.reduce((sum, p) => sum + p.avg_performance, 0) / performanceByClass.length
						: 0;

				setStats({
					totalClasses: classesData?.length || 0,
					totalStudents,
					totalAssessments: assessmentsData?.length || 0,
					classTeacherOf: classTeacherCount,
					avgStudentPerformance: overallAvg,
				});
			} catch (error) {
				console.error('Error fetching year data:', error);
				showNotification('Error', 'Failed to load year data', 'danger');
			}
		};
		fetchYearData();
	}, [selectedYear, teacherId, teacher]);

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	if (loadingData) {
		return (
			<PageWrapper>
				<Page container='fluid'>
					<div className='text-center py-5'>
						<div className='spinner-border' role='status'>
							<span className='visually-hidden'>Loading...</span>
						</div>
					</div>
				</Page>
			</PageWrapper>
		);
	}

	if (!teacher) {
		return (
			<PageWrapper>
				<Page container='fluid'>
					<div className='text-center py-5'>
						<h4>Teacher not found</h4>
						<Button color='primary' onClick={() => router.push('/admin/teachers')}>
							Back to Teachers
						</Button>
					</div>
				</Page>
			</PageWrapper>
		);
	}

	return (
		<PageWrapper>
			<Head>
				<title>{teacher.user.full_name} - Teacher Profile</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/teachers')}>
						Back to Teachers
					</Button>
					<span className='h4 mb-0 fw-bold'>{teacher.user.full_name}</span>
					<span className='text-muted ms-2'>({teacher.employee_id})</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				{/* Academic Year Filter */}
				<div className='row mb-4'>
					<div className='col-12'>
						<Card className='shadow-sm'>
							<CardBody>
								<div className='d-flex align-items-center justify-content-between'>
									<div>
										<h5 className='mb-0'>Teacher Performance Dashboard</h5>
										<p className='text-muted mb-0 small'>Monitor teaching effectiveness and workload</p>
									</div>
									<div style={{ minWidth: '250px' }}>
										<label className='form-label small mb-1'>Academic Year</label>
										<select
											className='form-select'
											value={selectedYear}
											onChange={(e) => setSelectedYear(e.target.value)}>
											<option value='all'>All Years</option>
											{academicYears.map((year) => (
												<option key={year.id} value={year.id}>
													{year.name} {year.is_current ? '(Current)' : ''}
												</option>
											))}
										</select>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Statistics Cards - Better Layout */}
				<div className='row mb-4'>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card className='shadow-sm h-100'>
							<CardBody>
								<div className='d-flex align-items-center'>
									<div className='flex-shrink-0'>
										<div className='bg-l10-primary text-primary rounded-2 p-3'>
											<span className='fs-3 fw-bold'>{stats.totalClasses}</span>
										</div>
									</div>
									<div className='flex-grow-1 ms-3'>
										<div className='fw-bold text-muted'>Classes Assigned</div>
										<div className='text-muted small'>
											{stats.classTeacherOf > 0 && `${stats.classTeacherOf} as Class Teacher`}
										</div>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card className='shadow-sm h-100'>
							<CardBody>
								<div className='d-flex align-items-center'>
									<div className='flex-shrink-0'>
										<div className='bg-l10-success text-success rounded-2 p-3'>
											<span className='fs-3 fw-bold'>{stats.totalStudents}</span>
										</div>
									</div>
									<div className='flex-grow-1 ms-3'>
										<div className='fw-bold text-muted'>Total Students</div>
										<div className='text-muted small'>Across all classes</div>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card className='shadow-sm h-100'>
							<CardBody>
								<div className='d-flex align-items-center'>
									<div className='flex-shrink-0'>
										<div className='bg-l10-info text-info rounded-2 p-3'>
											<span className='fs-3 fw-bold'>{stats.totalAssessments}</span>
										</div>
									</div>
									<div className='flex-grow-1 ms-3'>
										<div className='fw-bold text-muted'>Assessments Created</div>
										<div className='text-muted small'>Tests & Exams</div>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card className='shadow-sm h-100'>
							<CardBody>
								<div className='d-flex align-items-center'>
									<div className='flex-shrink-0'>
										<div
											className={`bg-l10-${
												stats.avgStudentPerformance >= 75
													? 'success'
													: stats.avgStudentPerformance >= 50
													? 'warning'
													: 'danger'
											} text-${
												stats.avgStudentPerformance >= 75
													? 'success'
													: stats.avgStudentPerformance >= 50
													? 'warning'
													: 'danger'
											} rounded-2 p-3`}>
											<span className='fs-3 fw-bold'>{stats.avgStudentPerformance.toFixed(1)}%</span>
										</div>
									</div>
									<div className='flex-grow-1 ms-3'>
										<div className='fw-bold text-muted'>Avg Performance</div>
										<div className='text-muted small'>Student scores</div>
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
									<li className='nav-item'>
										<button
											className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
											onClick={() => setActiveTab('overview')}>
											Overview & Profile
										</button>
									</li>
									<li className='nav-item'>
										<button
											className={`nav-link ${activeTab === 'classes' ? 'active' : ''}`}
											onClick={() => setActiveTab('classes')}>
											Classes & Subjects
										</button>
									</li>
									<li className='nav-item'>
										<button
											className={`nav-link ${activeTab === 'performance' ? 'active' : ''}`}
											onClick={() => setActiveTab('performance')}>
											Student Performance
										</button>
									</li>
								</ul>
							</CardHeader>
							<CardBody>
								{/* Overview Tab */}
								{activeTab === 'overview' && (
									<div className='row'>
										<div className='col-lg-4 col-md-6 mb-4'>
											<Card className='shadow-sm h-100'>
												<CardHeader>
													<CardLabel icon='Person'>
														<CardTitle>Personal Information</CardTitle>
													</CardLabel>
												</CardHeader>
												<CardBody>
													<table className='table table-borderless mb-0'>
														<tbody>
															<tr>
																<td className='fw-bold' style={{ width: '40%' }}>
																	Full Name:
																</td>
																<td>{teacher.user.full_name}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Employee ID:</td>
																<td>{teacher.employee_id}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Email:</td>
																<td className='text-break'>{teacherEmail || 'N/A'}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Phone:</td>
																<td>{teacher.user.phone || 'N/A'}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Address:</td>
																<td>{teacher.user.address || 'N/A'}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Status:</td>
																<td>
																	{teacher.user.is_active ? (
																		<span className='badge bg-success'>Active</span>
																	) : (
																		<span className='badge bg-danger'>Inactive</span>
																	)}
																</td>
															</tr>
														</tbody>
													</table>
												</CardBody>
											</Card>
										</div>
										<div className='col-lg-4 col-md-6 mb-4'>
											<Card className='shadow-sm h-100'>
												<CardHeader>
													<CardLabel icon='Work'>
														<CardTitle>Employment Details</CardTitle>
													</CardLabel>
												</CardHeader>
												<CardBody>
													<table className='table table-borderless mb-0'>
														<tbody>
															<tr>
																<td className='fw-bold' style={{ width: '45%' }}>
																	Joining Date:
																</td>
																<td>{new Date(teacher.joining_date).toLocaleDateString()}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Years of Service:</td>
																<td>
																	{Math.floor(
																		(new Date().getTime() - new Date(teacher.joining_date).getTime()) /
																			(1000 * 60 * 60 * 24 * 365)
																	)}{' '}
																	years
																</td>
															</tr>
															<tr>
																<td className='fw-bold'>Subjects:</td>
																<td>
																	{teacher.subjects && teacher.subjects.length > 0 ? (
																		teacher.subjects.map((subject, idx) => (
																			<span key={idx} className='badge bg-info me-1 mb-1'>
																				{subject}
																			</span>
																		))
																	) : (
																		<span className='text-muted'>None</span>
																	)}
																</td>
															</tr>
															<tr>
																<td className='fw-bold'>Classes Assigned:</td>
																<td>{stats.totalClasses}</td>
															</tr>
															<tr>
																<td className='fw-bold'>Class Teacher Of:</td>
																<td>{stats.classTeacherOf} class(es)</td>
															</tr>
															<tr>
																<td className='fw-bold'>Total Students:</td>
																<td>{stats.totalStudents}</td>
															</tr>
														</tbody>
													</table>
												</CardBody>
											</Card>
										</div>
										<div className='col-lg-4 col-md-12 mb-4'>
											<Card className='shadow-sm h-100'>
												<CardHeader>
													<CardLabel icon='Assessment'>
														<CardTitle>Teaching Summary</CardTitle>
													</CardLabel>
												</CardHeader>
												<CardBody>
													<div className='mb-4'>
														<div className='d-flex justify-content-between align-items-center mb-2'>
															<span className='text-muted'>Assessments Created</span>
															<span className='fs-4 fw-bold text-info'>{stats.totalAssessments}</span>
														</div>
														<div className='progress' style={{ height: '8px' }}>
															<div
																className='progress-bar bg-info'
																style={{ width: `${Math.min((stats.totalAssessments / 50) * 100, 100)}%` }}
															/>
														</div>
														<small className='text-muted'>Target: 50 per year</small>
													</div>
													<div className='mb-4'>
														<div className='d-flex justify-content-between align-items-center mb-2'>
															<span className='text-muted'>Average Student Performance</span>
															<span
																className={`fs-4 fw-bold text-${
																	stats.avgStudentPerformance >= 75
																		? 'success'
																		: stats.avgStudentPerformance >= 50
																		? 'warning'
																		: 'danger'
																}`}>
																{stats.avgStudentPerformance.toFixed(1)}%
															</span>
														</div>
														<div className='progress' style={{ height: '8px' }}>
															<div
																className={`progress-bar bg-${
																	stats.avgStudentPerformance >= 75
																		? 'success'
																		: stats.avgStudentPerformance >= 50
																		? 'warning'
																		: 'danger'
																}`}
																style={{ width: `${stats.avgStudentPerformance}%` }}
															/>
														</div>
														<small className='text-muted'>Target: 75% and above</small>
													</div>
													<div>
														<div className='d-flex justify-content-between align-items-center mb-2'>
															<span className='text-muted'>Student-Teacher Ratio</span>
															<span className='fs-4 fw-bold text-primary'>
																{stats.totalClasses > 0
																	? Math.round(stats.totalStudents / stats.totalClasses)
																	: 0}
																:1
															</span>
														</div>
														<small className='text-muted'>
															{stats.totalStudents} students across {stats.totalClasses} classes
														</small>
													</div>
												</CardBody>
											</Card>
										</div>
									</div>
								)}

								{/* Classes Tab */}
								{activeTab === 'classes' && (
									<div>
										{assignedClasses.length === 0 ? (
											<div className='text-center py-5 text-muted'>
												<p className='fs-5'>No classes assigned for the selected academic year</p>
												<p className='small'>Try selecting a different academic year</p>
											</div>
										) : (
											<div>
												<div className='row mb-4'>
													<div className='col-12'>
														<div className='alert alert-info mb-0'>
															<strong>{assignedClasses.length}</strong> class(es) assigned •{' '}
															<strong>{stats.classTeacherOf}</strong> as Class Teacher •{' '}
															<strong>{stats.totalStudents}</strong> total students
														</div>
													</div>
												</div>
												<div className='row'>
													{assignedClasses.map((tc) => {
														const perfData = studentPerformance.find(
															(p) => p.class_name === tc.class.name
														);
														return (
															<div key={tc.id} className='col-lg-6 col-md-12 mb-4'>
																<Card className='shadow-sm h-100'>
																	<CardHeader>
																		<CardLabel>
																			<CardTitle className='h5'>
																				{tc.class.name}
																				{tc.is_class_teacher && (
																					<span className='badge bg-success ms-2'>
																						Class Teacher
																					</span>
																				)}
																			</CardTitle>
																		</CardLabel>
																	</CardHeader>
																	<CardBody>
																		<div className='mb-3'>
																			<div className='d-flex justify-content-between mb-2'>
																				<span className='text-muted'>Grade Level:</span>
																				<span className='fw-bold'>{tc.class.grade_level}</span>
																			</div>
																			<div className='d-flex justify-content-between mb-2'>
																				<span className='text-muted'>Subject:</span>
																				<span>
																					{tc.subject ? (
																						<span className='badge bg-info'>
																							{tc.subject.name} ({tc.subject.code})
																						</span>
																					) : (
																						<span className='badge bg-secondary'>
																							All Subjects
																						</span>
																					)}
																				</span>
																			</div>
																			<div className='d-flex justify-content-between mb-2'>
																				<span className='text-muted'>Total Students:</span>
																				<span className='fw-bold'>
																					{perfData?.total_students || 0}
																				</span>
																			</div>
																			<div className='d-flex justify-content-between mb-2'>
																				<span className='text-muted'>Assessments:</span>
																				<span className='fw-bold'>
																					{perfData?.assessments_count || 0}
																				</span>
																			</div>
																			<div className='d-flex justify-content-between'>
																				<span className='text-muted'>Avg Performance:</span>
																				<span
																					className={`fw-bold text-${
																						(perfData?.avg_performance || 0) >= 75
																							? 'success'
																							: (perfData?.avg_performance || 0) >= 50
																							? 'warning'
																							: 'danger'
																					}`}>
																					{perfData?.avg_performance.toFixed(1) || '0.0'}%
																				</span>
																			</div>
																		</div>
																		{perfData && perfData.avg_performance > 0 && (
																			<div className='progress' style={{ height: '10px' }}>
																				<div
																					className={`progress-bar bg-${
																						perfData.avg_performance >= 75
																							? 'success'
																							: perfData.avg_performance >= 50
																							? 'warning'
																							: 'danger'
																					}`}
																					style={{ width: `${perfData.avg_performance}%` }}
																				/>
																			</div>
																		)}
																	</CardBody>
																</Card>
															</div>
														);
													})}
												</div>
											</div>
										)}
									</div>
								)}

								{/* Performance Tab */}
								{activeTab === 'performance' && (
									<div>
										{studentPerformance.length === 0 ? (
											<div className='text-center py-5 text-muted'>
												<p className='fs-5'>No performance data available</p>
												<p className='small'>
													Performance data will appear once assessments are created and graded
												</p>
											</div>
										) : (
											<div>
												<div className='row mb-4'>
													<div className='col-12'>
														<Card className='shadow-sm'>
															<CardHeader>
																<CardLabel icon='TrendingUp'>
																	<CardTitle>Class-wise Student Performance</CardTitle>
																</CardLabel>
															</CardHeader>
															<CardBody>
																<div className='table-responsive'>
																	<table className='table table-modern table-hover'>
																		<thead>
																			<tr>
																				<th>Class Name</th>
																				<th className='text-center'>Total Students</th>
																				<th className='text-center'>Assessments</th>
																				<th className='text-center'>Avg Performance</th>
																				<th style={{ width: '30%' }}>Performance Bar</th>
																			</tr>
																		</thead>
																		<tbody>
																			{studentPerformance.map((perf, idx) => (
																				<tr key={idx}>
																					<td>
																						<div className='fw-bold'>{perf.class_name}</div>
																					</td>
																					<td className='text-center'>{perf.total_students}</td>
																					<td className='text-center'>
																						{perf.assessments_count}
																					</td>
																					<td className='text-center'>
																						<span
																							className={`badge bg-${
																								perf.avg_performance >= 75
																									? 'success'
																									: perf.avg_performance >= 50
																									? 'warning'
																									: 'danger'
																							} fs-6`}>
																							{perf.avg_performance.toFixed(1)}%
																						</span>
																					</td>
																					<td>
																						<div
																							className='progress'
																							style={{ height: '20px' }}>
																							<div
																								className={`progress-bar bg-${
																									perf.avg_performance >= 75
																										? 'success'
																										: perf.avg_performance >= 50
																										? 'warning'
																										: 'danger'
																								}`}
																								style={{
																									width: `${perf.avg_performance}%`,
																								}}>
																								{perf.avg_performance.toFixed(1)}%
																							</div>
																						</div>
																					</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															</CardBody>
														</Card>
													</div>
												</div>

												{/* Assessments List */}
												<div className='row'>
													<div className='col-12'>
														<Card className='shadow-sm'>
															<CardHeader>
																<CardLabel icon='Assignment'>
																	<CardTitle>Assessments Created</CardTitle>
																</CardLabel>
															</CardHeader>
															<CardBody>
																{assessments.length === 0 ? (
																	<div className='text-center py-4 text-muted'>
																		No assessments created for the selected academic year
																	</div>
																) : (
																	<div className='table-responsive'>
																		<table className='table table-modern table-hover'>
																			<thead>
																				<tr>
																					<th>Assessment Name</th>
																					<th className='text-center'>Max Marks</th>
																					<th className='text-center'>Assessment Date</th>
																				</tr>
																			</thead>
																			<tbody>
																				{assessments.map((assessment) => (
																					<tr key={assessment.id}>
																						<td>
																							<div className='fw-bold'>
																								{assessment.name}
																							</div>
																						</td>
																						<td className='text-center'>
																							{assessment.max_marks}
																						</td>
																						<td className='text-center'>
																							{assessment.assessment_date
																								? new Date(
																										assessment.assessment_date
																								  ).toLocaleDateString()
																								: 'Not scheduled'}
																						</td>
																					</tr>
																				))}
																			</tbody>
																		</table>
																	</div>
																)}
															</CardBody>
														</Card>
													</div>
												</div>
											</div>
										)}
									</div>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
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

export default AdminTeacherDetailPage;

