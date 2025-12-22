/**
 * Parent Dashboard
 * View children's information, attendance, grades, and apply for leave
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../layout/PageWrapper/PageWrapper';
import Page from '../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../layout/SubHeader/SubHeader';
import Button from '../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../components/bootstrap/Card';
import Icon from '../../components/icon/Icon';
import Badge from '../../components/bootstrap/Badge';
import Chart from '../../components/extras/Chart';
import { useAuth } from '../../lib/auth/useAuth';
import { UserRole, AttendanceStatus, LeaveStatus } from '../../lib/types/database';
import { supabase } from '../../lib/supabase/client';
import { ApexOptions } from 'apexcharts';

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
	class_id: string;
	date_of_birth: string;
	gender: string | null;
	blood_group: string | null;
}

interface AttendanceData {
	date: string;
	status: AttendanceStatus;
}

interface GradeData {
	subject_name: string;
	marks_obtained: number;
	total_marks: number;
	percentage: number;
}

interface LeaveApplication {
	id: string;
	start_date: string;
	end_date: string;
	reason: string;
	status: LeaveStatus;
}

interface ChildStats {
	attendanceRate: number;
	presentDays: number;
	absentDays: number;
	lateDays: number;
	totalDays: number;
	averageGrade: number;
	pendingLeaves: number;
	approvedLeaves: number;
}

const ParentDashboard: NextPage = () => {
	const router = useRouter();
	const { user, profile, loading, role } = useAuth();
	const [children, setChildren] = useState<Student[]>([]);
	const [loadingChildren, setLoadingChildren] = useState(true);
	const [selectedChild, setSelectedChild] = useState<Student | null>(null);
	const [childStats, setChildStats] = useState<ChildStats>({
		attendanceRate: 0,
		presentDays: 0,
		absentDays: 0,
		lateDays: 0,
		totalDays: 0,
		averageGrade: 0,
		pendingLeaves: 0,
		approvedLeaves: 0,
	});
	const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
	const [gradeData, setGradeData] = useState<GradeData[]>([]);
	const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
	const [loadingStats, setLoadingStats] = useState(false);

	// Protect route - only parents
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.PARENT)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch children
	useEffect(() => {
		const fetchChildren = async () => {
			if (!user) return;

			try {
				const { data, error } = await supabase
					.from('students')
					.select('*')
					.eq('parent_id', user.id)
					.order('full_name');

				if (error) {
					console.error('Error fetching children:', error);
					return;
				}

				setChildren(data || []);
				if (data && data.length > 0) {
					setSelectedChild(data[0]);
				}
			} catch (error) {
				console.error('Error fetching children:', error);
			} finally {
				setLoadingChildren(false);
			}
		};

		fetchChildren();
	}, [user]);

	// Fetch child statistics when selected child changes
	useEffect(() => {
		const fetchChildStats = async () => {
			if (!selectedChild) return;

			setLoadingStats(true);
			try {
				// Get attendance data for last 30 days
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				const { data: attendance } = await supabase
					.from('attendance_records')
					.select('date, status')
					.eq('student_id', selectedChild.id)
					.gte('date', thirtyDaysAgo.toISOString().split('T')[0])
					.order('date', { ascending: true });

				if (attendance) {
					setAttendanceData(attendance as AttendanceData[]);
					const present = attendance.filter((a) => a.status === AttendanceStatus.PRESENT).length;
					const absent = attendance.filter((a) => a.status === AttendanceStatus.ABSENT).length;
					const late = attendance.filter((a) => a.status === AttendanceStatus.LATE).length;
					const total = attendance.length;

					setChildStats((prev) => ({
						...prev,
						presentDays: present,
						absentDays: absent,
						lateDays: late,
						totalDays: total,
						attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
					}));
				}

				// Get grades data
				const { data: grades } = await supabase
					.from('grades')
					.select(`
						marks_obtained,
						total_marks,
						assessments (
							subjects (
								name
							)
						)
					`)
					.eq('student_id', selectedChild.id)
					.order('created_at', { ascending: false })
					.limit(10);

				if (grades) {
					const gradeDataFormatted: GradeData[] = grades.map((g: any) => ({
						subject_name: g.assessments?.subjects?.name || 'Unknown',
						marks_obtained: g.marks_obtained,
						total_marks: g.total_marks,
						percentage: Math.round((g.marks_obtained / g.total_marks) * 100),
					}));
					setGradeData(gradeDataFormatted);

					const avgGrade =
						gradeDataFormatted.length > 0
							? Math.round(
									gradeDataFormatted.reduce((sum, g) => sum + g.percentage, 0) /
										gradeDataFormatted.length
							  )
							: 0;
					setChildStats((prev) => ({ ...prev, averageGrade: avgGrade }));
				}

				// Get leave applications
				const { data: leaves } = await supabase
					.from('leave_applications')
					.select('id, start_date, end_date, reason, status')
					.eq('student_id', selectedChild.id)
					.order('created_at', { ascending: false })
					.limit(5);

				if (leaves) {
					setLeaveApplications(leaves as LeaveApplication[]);
					const pending = leaves.filter((l) => l.status === LeaveStatus.PENDING).length;
					const approved = leaves.filter((l) => l.status === LeaveStatus.APPROVED).length;
					setChildStats((prev) => ({
						...prev,
						pendingLeaves: pending,
						approvedLeaves: approved,
					}));
				}
			} catch (error) {
				console.error('Error fetching child stats:', error);
			} finally {
				setLoadingStats(false);
			}
		};

		fetchChildStats();
	}, [selectedChild]);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push('/auth-pages/login');
	};

	const handleViewChild = (studentId: string) => {
		router.push(`/parent/children/${studentId}`);
	};

	if (loading || !user || role !== UserRole.PARENT) {
		return null;
	}

	// Chart configurations
	const attendanceChartOptions: ApexOptions = {
		chart: {
			type: 'area',
			height: 300,
			toolbar: { show: false },
		},
		stroke: {
			curve: 'smooth',
			width: 2,
		},
		fill: {
			type: 'gradient',
			gradient: {
				shadeIntensity: 1,
				opacityFrom: 0.7,
				opacityTo: 0.3,
			},
		},
		xaxis: {
			categories: attendanceData.map((d) =>
				new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			),
		},
		yaxis: {
			labels: {
				formatter: (val) => (val === 1 ? 'Present' : val === 0 ? 'Absent' : 'Late'),
			},
		},
		colors: [String(process.env.NEXT_PUBLIC_SUCCESS_COLOR)],
		tooltip: {
			y: {
				formatter: (val) => (val === 1 ? 'Present' : val === 0 ? 'Absent' : 'Late'),
			},
		},
	};

	const attendanceChartSeries = [
		{
			name: 'Attendance',
			data: attendanceData.map((d) =>
				d.status === AttendanceStatus.PRESENT ? 1 : d.status === AttendanceStatus.LATE ? 0.5 : 0
			),
		},
	];

	const gradeChartOptions: ApexOptions = {
		chart: {
			type: 'bar',
			height: 300,
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: '55%',
				dataLabels: {
					position: 'top',
				},
			},
		},
		dataLabels: {
			enabled: true,
			formatter: (val) => `${val}%`,
			offsetY: -20,
		},
		xaxis: {
			categories: gradeData.map((g) => g.subject_name),
		},
		yaxis: {
			title: { text: 'Percentage' },
			max: 100,
		},
		colors: [String(process.env.NEXT_PUBLIC_INFO_COLOR)],
	};

	const gradeChartSeries = [{ name: 'Percentage', data: gradeData.map((g) => g.percentage) }];

	const attendanceDonutOptions: ApexOptions = {
		chart: {
			type: 'donut',
			height: 250,
		},
		labels: ['Present', 'Absent', 'Late'],
		colors: [
			String(process.env.NEXT_PUBLIC_SUCCESS_COLOR),
			String(process.env.NEXT_PUBLIC_DANGER_COLOR),
			String(process.env.NEXT_PUBLIC_WARNING_COLOR),
		],
		legend: {
			position: 'bottom',
		},
	};

	const attendanceDonutSeries = [
		childStats.presentDays,
		childStats.absentDays,
		childStats.lateDays,
	];

	return (
		<PageWrapper>
			<Head>
				<title>Parent Dashboard - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<span className='h4 mb-0 fw-bold'>Parent Dashboard</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<span className='text-muted me-3'>Welcome, {profile?.full_name}</span>
					<Button color='danger' isLight icon='Logout' onClick={handleSignOut}>
						Sign Out
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				{loadingChildren ? (
					<div className='text-center py-5'>
						<div className='spinner-border text-primary' role='status'>
							<span className='visually-hidden'>Loading...</span>
						</div>
					</div>
				) : children.length === 0 ? (
					<Card>
						<CardBody className='text-center py-5'>
							<Icon icon='Info' size='3x' color='info' className='mb-3' />
							<h4>No Children Found</h4>
							<p className='text-muted'>
								No student records are linked to your account. Please contact the school
								administrator.
							</p>
						</CardBody>
					</Card>
				) : (
					<>
						{/* Children Selection */}
						<div className='row mb-4'>
							<div className='col-12'>
								<Card>
									<CardHeader>
										<CardLabel icon='FamilyRestroom'>
											<CardTitle>My Children</CardTitle>
										</CardLabel>
									</CardHeader>
									<CardBody>
										<div className='row g-3'>
											{children.map((child) => (
												<div key={child.id} className='col-lg-3 col-md-6'>
													<Card
														className={`cursor-pointer ${
															selectedChild?.id === child.id
																? 'border-primary bg-l10-primary'
																: ''
														}`}
														onClick={() => setSelectedChild(child)}
														style={{ cursor: 'pointer' }}>
														<CardBody>
															<div className='d-flex align-items-center'>
																<div className='flex-shrink-0'>
																	<Icon
																		icon='Person'
																		size='2x'
																		color={
																			selectedChild?.id === child.id
																				? 'primary'
																				: 'secondary'
																		}
																	/>
																</div>
																<div className='flex-grow-1 ms-3'>
																	<div className='fw-bold'>
																		{child.full_name}
																	</div>
																	<div className='text-muted small'>
																		{child.admission_number}
																	</div>
																	{selectedChild?.id === child.id && (
																		<Badge color='primary' className='mt-1'>
																			Selected
																		</Badge>
																	)}
																</div>
															</div>
														</CardBody>
													</Card>
												</div>
											))}
										</div>
									</CardBody>
								</Card>
							</div>
						</div>

						{/* Statistics Cards */}
						{selectedChild && (
							<>
								<div className='row mb-4'>
									<div className='col-lg-3 col-md-6 mb-3'>
										<Card stretch className='bg-l10-success'>
											<CardBody className='d-flex align-items-center'>
												<div className='flex-shrink-0'>
													<Icon icon='CheckCircle' size='3x' color='success' />
												</div>
												<div className='flex-grow-1 ms-3'>
													<div className='fw-bold fs-3 mb-0'>
														{loadingStats ? '...' : `${childStats.attendanceRate}%`}
													</div>
													<div className='text-muted'>Attendance Rate</div>
												</div>
											</CardBody>
										</Card>
									</div>
									<div className='col-lg-3 col-md-6 mb-3'>
										<Card stretch className='bg-l10-info'>
											<CardBody className='d-flex align-items-center'>
												<div className='flex-shrink-0'>
													<Icon icon='Grade' size='3x' color='info' />
												</div>
												<div className='flex-grow-1 ms-3'>
													<div className='fw-bold fs-3 mb-0'>
														{loadingStats ? '...' : `${childStats.averageGrade}%`}
													</div>
													<div className='text-muted'>Average Grade</div>
												</div>
											</CardBody>
										</Card>
									</div>
									<div className='col-lg-3 col-md-6 mb-3'>
										<Card stretch>
											<CardBody className='d-flex align-items-center'>
												<div className='flex-shrink-0'>
													<Icon icon='EventNote' size='3x' color='warning' />
												</div>
												<div className='flex-grow-1 ms-3'>
													<div className='fw-bold fs-3 mb-0'>
														{loadingStats ? '...' : childStats.pendingLeaves}
													</div>
													<div className='text-muted'>Pending Leaves</div>
												</div>
											</CardBody>
										</Card>
									</div>
									<div className='col-lg-3 col-md-6 mb-3'>
										<Card stretch>
											<CardBody className='d-flex align-items-center'>
												<div className='flex-shrink-0'>
													<Icon icon='CalendarToday' size='3x' color='primary' />
												</div>
												<div className='flex-grow-1 ms-3'>
													<div className='fw-bold fs-3 mb-0'>
														{loadingStats ? '...' : childStats.totalDays}
													</div>
													<div className='text-muted'>Total Days</div>
												</div>
											</CardBody>
										</Card>
									</div>
								</div>

								{/* Charts Row */}
								<div className='row mb-4'>
									<div className='col-lg-8 mb-3'>
										<Card stretch>
											<CardHeader>
												<CardLabel icon='ShowChart'>
													<CardTitle>Attendance Trend (Last 30 Days)</CardTitle>
												</CardLabel>
											</CardHeader>
											<CardBody>
												{loadingStats ? (
													<div className='text-center py-5'>
														<div className='spinner-border text-primary' role='status'>
															<span className='visually-hidden'>Loading...</span>
														</div>
													</div>
												) : attendanceData.length === 0 ? (
													<div className='text-center py-5'>
														<Icon icon='Info' size='3x' color='info' className='mb-3' />
														<p className='text-muted'>No attendance data available</p>
													</div>
												) : (
													<Chart
														series={attendanceChartSeries}
														options={attendanceChartOptions}
														type='area'
														height={300}
													/>
												)}
											</CardBody>
										</Card>
									</div>
									<div className='col-lg-4 mb-3'>
										<Card stretch>
											<CardHeader>
												<CardLabel icon='PieChart'>
													<CardTitle>Attendance Summary</CardTitle>
												</CardLabel>
											</CardHeader>
											<CardBody>
												{loadingStats ? (
													<div className='text-center py-5'>
														<div className='spinner-border text-primary' role='status'>
															<span className='visually-hidden'>Loading...</span>
														</div>
													</div>
												) : childStats.totalDays === 0 ? (
													<div className='text-center py-5'>
														<Icon icon='Info' size='3x' color='info' className='mb-3' />
														<p className='text-muted'>No attendance data</p>
													</div>
												) : (
													<Chart
														series={attendanceDonutSeries}
														options={attendanceDonutOptions}
														type='donut'
														height={250}
													/>
												)}
											</CardBody>
										</Card>
									</div>
								</div>

								{/* Grades Chart */}
								<div className='row mb-4'>
									<div className='col-12'>
										<Card>
											<CardHeader>
												<CardLabel icon='BarChart'>
													<CardTitle>Recent Grades by Subject</CardTitle>
												</CardLabel>
											</CardHeader>
											<CardBody>
												{loadingStats ? (
													<div className='text-center py-5'>
														<div className='spinner-border text-primary' role='status'>
															<span className='visually-hidden'>Loading...</span>
														</div>
													</div>
												) : gradeData.length === 0 ? (
													<div className='text-center py-5'>
														<Icon icon='Info' size='3x' color='info' className='mb-3' />
														<p className='text-muted'>No grade data available</p>
													</div>
												) : (
													<Chart
														series={gradeChartSeries}
														options={gradeChartOptions}
														type='bar'
														height={300}
													/>
												)}
											</CardBody>
										</Card>
									</div>
								</div>

								{/* Quick Actions & Leave Applications */}
								<div className='row'>
									<div className='col-lg-8 mb-3'>
										<Card stretch>
											<CardHeader>
												<CardLabel icon='Dashboard'>
													<CardTitle>Quick Actions</CardTitle>
												</CardLabel>
											</CardHeader>
											<CardBody>
												<div className='row g-3'>
													<div className='col-lg-3 col-md-6'>
														<Button
															color='primary'
															isLight
															className='w-100 p-3'
															icon='EventNote'
															onClick={() => router.push('/parent/leave/apply')}>
															<div className='mt-2 small'>Apply Leave</div>
														</Button>
													</div>
													<div className='col-lg-3 col-md-6'>
														<Button
															color='success'
															isLight
															className='w-100 p-3'
															icon='CheckCircle'
															onClick={() => router.push('/parent/attendance')}>
															<div className='mt-2 small'>View Attendance</div>
														</Button>
													</div>
													<div className='col-lg-3 col-md-6'>
														<Button
															color='info'
															isLight
															className='w-100 p-3'
															icon='Grade'
															onClick={() => router.push('/parent/grades')}>
															<div className='mt-2 small'>View Grades</div>
														</Button>
													</div>
													<div className='col-lg-3 col-md-6'>
														<Button
															color='warning'
															isLight
															className='w-100 p-3'
															icon='Campaign'
															onClick={() => router.push('/parent/announcements')}>
															<div className='mt-2 small'>Announcements</div>
														</Button>
													</div>
												</div>
											</CardBody>
										</Card>
									</div>
									<div className='col-lg-4 mb-3'>
										<Card stretch>
											<CardHeader>
												<CardLabel icon='EventNote'>
													<CardTitle>Recent Leave Applications</CardTitle>
												</CardLabel>
											</CardHeader>
											<CardBody>
												{loadingStats ? (
													<div className='text-center py-3'>
														<div className='spinner-border spinner-border-sm text-primary' role='status'>
															<span className='visually-hidden'>Loading...</span>
														</div>
													</div>
												) : leaveApplications.length === 0 ? (
													<p className='text-muted text-center'>No leave applications</p>
												) : (
													<div className='d-flex flex-column gap-3'>
														{leaveApplications.map((leave) => (
															<div key={leave.id} className='border-bottom pb-2'>
																<div className='small fw-bold'>{leave.reason}</div>
																<div className='text-muted' style={{ fontSize: '0.75rem' }}>
																	{new Date(leave.start_date).toLocaleDateString()} -{' '}
																	{new Date(leave.end_date).toLocaleDateString()}
																</div>
																<Badge
																	color={
																		leave.status === LeaveStatus.APPROVED
																			? 'success'
																			: leave.status === LeaveStatus.PENDING
																			? 'warning'
																			: 'danger'
																	}
																	isLight
																	className='mt-1'>
																	{leave.status}
																</Badge>
															</div>
														))}
													</div>
												)}
												<div className='mt-3'>
													<Button
														color='primary'
														isOutline
														icon='Add'
														className='w-100'
														onClick={() => router.push('/parent/leave')}>
														View All Leaves
													</Button>
												</div>
											</CardBody>
										</Card>
									</div>
								</div>
							</>
						)}
					</>
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

export default ParentDashboard;

