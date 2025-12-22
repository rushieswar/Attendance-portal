/**
 * Admin - Student Details Page
 * Displays comprehensive student information including profile, attendance, and academic performance across all years
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../../layout/PageWrapper/PageWrapper';
import Page from '../../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../../layout/SubHeader/SubHeader';
import Button from '../../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../../components/bootstrap/Card';
import { useAuth } from '../../../../lib/auth/useAuth';
import { UserRole, AttendanceStatus } from '../../../../lib/types/database';
import { supabase } from '../../../../lib/supabase/client';
import showNotification from '../../../../components/extras/showNotification';
import Select from '../../../../components/bootstrap/forms/Select';

interface StudentData {
	id: string;
	full_name: string;
	admission_number: string;
	date_of_birth: string;
	gender: string | null;
	blood_group: string | null;
	enrollment_date: string;
	address: string | null;
	emergency_contact: string | null;
	medical_conditions: string | null;
	class: {
		id: string;
		name: string;
		grade_level: string;
		academic_year: {
			id: string;
			name: string;
		};
	} | null;
	parent: {
		id: string;
		full_name: string;
		phone: string | null;
		address: string | null;
	};
}

interface AttendanceRecord {
	id: string;
	date: string;
	status: AttendanceStatus;
	class: {
		name: string;
		academic_year: {
			name: string;
		};
	};
}

interface GradeRecord {
	id: string;
	marks_obtained: number;
	remarks: string | null;
	assessment: {
		name: string;
		max_marks: number;
		assessment_date: string | null;
		academic_year: {
			name: string;
		};
	};
	subject: {
		name: string;
		code: string;
	};
}

interface AcademicYear {
	id: string;
	name: string;
}

const StudentDetailsPage: NextPage = () => {
	const router = useRouter();
	const { id: studentId } = router.query;
	const { user, role, loading } = useAuth();
	const [student, setStudent] = useState<StudentData | null>(null);
	const [parentEmail, setParentEmail] = useState<string>('');
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
	const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'grades'>('profile');
	const [selectedYear, setSelectedYear] = useState<string>('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch student details and all related data
	useEffect(() => {
		const fetchData = async () => {
			if (!studentId || typeof studentId !== 'string' || !user) return;
			try {
				// Fetch student with parent and current class info
				const { data: studentData, error: studentError } = await supabase
					.from('students')
					.select(`
						*,
						class:classes(
							id,
							name,
							grade_level,
							academic_year:academic_years(id, name)
						),
						parent:profiles!students_parent_id_fkey(
							id,
							full_name,
							phone,
							address
						)
					`)
					.eq('id', studentId)
					.single();

				if (studentError) throw studentError;
				setStudent(studentData);

				// Fetch parent's email via API route (requires service role)
				if (studentData?.parent?.id) {
					try {
						const response = await fetch(`/api/users/get-email?userId=${studentData.parent.id}`);
						if (response.ok) {
							const { email } = await response.json();
							setParentEmail(email || 'N/A');
						}
					} catch (err) {
						console.error('Error fetching parent email:', err);
						setParentEmail('N/A');
					}
				}

				// Fetch all academic years
				const { data: yearsData, error: yearsError } = await supabase
					.from('academic_years')
					.select('id, name')
					.order('start_date', { ascending: false });

				if (yearsError) throw yearsError;
				setAcademicYears(yearsData || []);

				// Fetch ALL attendance records across all years
				const { data: attendanceData, error: attendanceError } = await supabase
					.from('attendance_records')
					.select(`
						id,
						date,
						status,
						class:classes(
							name,
							academic_year:academic_years(name)
						)
					`)
					.eq('student_id', studentId)
					.order('date', { ascending: false });

				if (attendanceError) throw attendanceError;
				setAttendanceRecords(attendanceData || []);

				// Fetch ALL grades across all years
				const { data: gradesData, error: gradesError } = await supabase
					.from('grades')
					.select(`
						id,
						marks_obtained,
						remarks,
						assessment:assessments(
							name,
							max_marks,
							assessment_date,
							academic_year:academic_years(name)
						),
						subject:subjects(name, code)
					`)
					.eq('student_id', studentId)
					.order('created_at', { ascending: false });

				if (gradesError) throw gradesError;
				setGradeRecords(gradesData || []);
			} catch (error) {
				console.error('Error fetching data:', error);
				showNotification('Error', 'Failed to load student data', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchData();
	}, [studentId, user]);

	// Filter records by selected academic year
	const filteredAttendance = selectedYear === 'all'
		? attendanceRecords
		: attendanceRecords.filter(r => r.class.academic_year.name === selectedYear);

	const filteredGrades = selectedYear === 'all'
		? gradeRecords
		: gradeRecords.filter(r => r.assessment.academic_year.name === selectedYear);

	// Calculate attendance statistics
	const calculateAttendanceStats = () => {
		const total = filteredAttendance.length;
		const present = filteredAttendance.filter((r) => r.status === AttendanceStatus.PRESENT).length;
		const absent = filteredAttendance.filter((r) => r.status === AttendanceStatus.ABSENT).length;
		const late = filteredAttendance.filter((r) => r.status === AttendanceStatus.LATE).length;
		const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
		return { total, present, absent, late, percentage };
	};

	// Calculate average marks
	const calculateAverageMarks = () => {
		if (filteredGrades.length === 0) return '0';
		const totalPercentage = filteredGrades.reduce((sum, grade) => {
			const percentage = (grade.marks_obtained / grade.assessment.max_marks) * 100;
			return sum + percentage;
		}, 0);
		return (totalPercentage / filteredGrades.length).toFixed(1);
	};

	// Calculate age
	const calculateAge = (dob: string) => {
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}
		return age;
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	const attendanceStats = calculateAttendanceStats();
	const averageMarks = calculateAverageMarks();

	return (
		<PageWrapper>
			<Head>
				<title>{student?.full_name || 'Student Details'} - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/students')}>
						Back to Students
					</Button>
					<span className='h4 mb-0 fw-bold'>{student?.full_name || 'Loading...'}</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Select
						ariaLabel='Academic Year Filter'
						value={selectedYear}
						onChange={(e: any) => setSelectedYear(e.target.value)}>
						<option value='all'>All Academic Years</option>
						{academicYears.map((year) => (
							<option key={year.id} value={year.name}>
								{year.name}
							</option>
						))}
					</Select>
				</SubHeaderRight>
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
												<div className='fw-bold h4 mb-0'>{filteredGrades.length}</div>
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
													className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
													onClick={() => setActiveTab('profile')}
													type='button'
													role='tab'>
													Student Profile
												</button>
											</li>
											<li className='nav-item' role='presentation'>
												<button
													className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
													onClick={() => setActiveTab('attendance')}
													type='button'
													role='tab'>
													Attendance History
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
									<CardBody>
										{activeTab === 'profile' && (
											<div className='row'>
												<div className='col-md-6'>
													<Card className='mb-4'>
														<CardHeader>
															<CardLabel icon='Person'>
																<CardTitle>Personal Information</CardTitle>
															</CardLabel>
														</CardHeader>
														<CardBody>
															<table className='table table-borderless'>
																<tbody>
																	<tr>
																		<td className='fw-bold'>Full Name:</td>
																		<td>{student.full_name}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Admission Number:</td>
																		<td>{student.admission_number}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Date of Birth:</td>
																		<td>
																			{new Date(student.date_of_birth).toLocaleDateString()}
																			<span className='text-muted ms-2'>
																				({calculateAge(student.date_of_birth)} years old)
																			</span>
																		</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Gender:</td>
																		<td>{student.gender || '-'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Blood Group:</td>
																		<td>{student.blood_group || '-'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Enrollment Date:</td>
																		<td>{new Date(student.enrollment_date).toLocaleDateString()}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Current Class:</td>
																		<td>
																			{student.class
																				? `${student.class.name} (${student.class.grade_level}) - ${student.class.academic_year.name}`
																				: 'Not Assigned'}
																		</td>
																	</tr>
																</tbody>
															</table>
														</CardBody>
													</Card>

													<Card>
														<CardHeader>
															<CardLabel icon='MedicalServices'>
																<CardTitle>Medical & Emergency</CardTitle>
															</CardLabel>
														</CardHeader>
														<CardBody>
															<table className='table table-borderless'>
																<tbody>
																	<tr>
																		<td className='fw-bold'>Emergency Contact:</td>
																		<td>{student.emergency_contact || '-'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Medical Conditions:</td>
																		<td>{student.medical_conditions || 'None reported'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Address:</td>
																		<td>{student.address || '-'}</td>
																	</tr>
																</tbody>
															</table>
														</CardBody>
													</Card>
												</div>

												<div className='col-md-6'>
													<Card>
														<CardHeader>
															<CardLabel icon='FamilyRestroom'>
																<CardTitle>Parent/Guardian Information</CardTitle>
															</CardLabel>
														</CardHeader>
														<CardBody>
															<table className='table table-borderless'>
																<tbody>
																	<tr>
																		<td className='fw-bold'>Name:</td>
																		<td>{student.parent.full_name}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Email:</td>
																		<td>{parentEmail || 'N/A'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Phone:</td>
																		<td>{student.parent.phone || '-'}</td>
																	</tr>
																	<tr>
																		<td className='fw-bold'>Address:</td>
																		<td>{student.parent.address || '-'}</td>
																	</tr>
																</tbody>
															</table>
														</CardBody>
													</Card>
												</div>
											</div>
										)}

										{activeTab === 'attendance' && (
											<div className='table-responsive'>
												{filteredAttendance.length === 0 ? (
													<div className='text-center py-5 text-muted'>
														No attendance records found
														{selectedYear !== 'all' && ` for ${selectedYear}`}
													</div>
												) : (
													<>
														<div className='mb-3'>
															<div className='row'>
																<div className='col-md-3'>
																	<div className='p-3 bg-light rounded'>
																		<div className='text-muted small'>Total Days</div>
																		<div className='fw-bold h5 mb-0'>{attendanceStats.total}</div>
																	</div>
																</div>
																<div className='col-md-3'>
																	<div className='p-3 bg-success bg-opacity-10 rounded'>
																		<div className='text-muted small'>Present</div>
																		<div className='fw-bold h5 mb-0 text-success'>{attendanceStats.present}</div>
																	</div>
																</div>
																<div className='col-md-3'>
																	<div className='p-3 bg-danger bg-opacity-10 rounded'>
																		<div className='text-muted small'>Absent</div>
																		<div className='fw-bold h5 mb-0 text-danger'>{attendanceStats.absent}</div>
																	</div>
																</div>
																<div className='col-md-3'>
																	<div className='p-3 bg-warning bg-opacity-10 rounded'>
																		<div className='text-muted small'>Late</div>
																		<div className='fw-bold h5 mb-0 text-warning'>{attendanceStats.late}</div>
																	</div>
																</div>
															</div>
														</div>
														<table className='table table-modern table-hover'>
															<thead>
																<tr>
																	<th>Date</th>
																	<th>Class</th>
																	<th>Academic Year</th>
																	<th>Status</th>
																</tr>
															</thead>
															<tbody>
																{filteredAttendance.map((record) => (
																	<tr key={record.id}>
																		<td>{new Date(record.date).toLocaleDateString()}</td>
																		<td>{record.class.name}</td>
																		<td>{record.class.academic_year.name}</td>
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
													</>
												)}
											</div>
										)}

										{activeTab === 'grades' && (
											<div className='table-responsive'>
												{filteredGrades.length === 0 ? (
													<div className='text-center py-5 text-muted'>
														No grades found
														{selectedYear !== 'all' && ` for ${selectedYear}`}
													</div>
												) : (
													<>
														<div className='mb-3'>
															<div className='row'>
																<div className='col-md-4'>
																	<div className='p-3 bg-light rounded'>
																		<div className='text-muted small'>Total Assessments</div>
																		<div className='fw-bold h5 mb-0'>{filteredGrades.length}</div>
																	</div>
																</div>
																<div className='col-md-4'>
																	<div className='p-3 bg-info bg-opacity-10 rounded'>
																		<div className='text-muted small'>Average Score</div>
																		<div className='fw-bold h5 mb-0 text-info'>{averageMarks}%</div>
																	</div>
																</div>
																<div className='col-md-4'>
																	<div className='p-3 bg-success bg-opacity-10 rounded'>
																		<div className='text-muted small'>Passed (≥50%)</div>
																		<div className='fw-bold h5 mb-0 text-success'>
																			{filteredGrades.filter(g => (g.marks_obtained / g.assessment.max_marks) * 100 >= 50).length}
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<table className='table table-modern table-hover'>
															<thead>
																<tr>
																	<th>Assessment</th>
																	<th>Subject</th>
																	<th>Academic Year</th>
																	<th>Date</th>
																	<th>Marks</th>
																	<th>Percentage</th>
																	<th>Remarks</th>
																</tr>
															</thead>
															<tbody>
																{filteredGrades.map((grade) => {
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
																			<td>{grade.assessment.academic_year.name}</td>
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
																			<td>{grade.remarks || '-'}</td>
																		</tr>
																	);
																})}
															</tbody>
														</table>
													</>
												)}
											</div>
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

export default StudentDetailsPage;

