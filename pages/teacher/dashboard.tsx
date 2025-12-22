/**
 * Teacher Dashboard
 * Access to students, attendance, grades, and class management
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
import { UserRole, AttendanceStatus } from '../../lib/types/database';
import { supabase } from '../../lib/supabase/client';
import { ApexOptions } from 'apexcharts';

interface ClassInfo {
	id: string;
	name: string;
	grade_level: string;
	studentCount: number;
}

interface UpcomingAssessment {
	id: string;
	name: string;
	assessment_date: string;
	class_name: string;
}

interface WeeklyAttendance {
	date: string;
	present: number;
	absent: number;
	late: number;
	total: number;
}

const TeacherDashboard: NextPage = () => {
	const router = useRouter();
	const { user, profile, loading, role } = useAuth();
	const [stats, setStats] = useState({
		totalStudents: 0,
		myClasses: 0,
		todayAttendance: 0,
		todayPresent: 0,
		todayAbsent: 0,
		todayLate: 0,
		pendingGrades: 0,
		upcomingAssessments: 0,
		pendingLeaves: 0,
	});
	const [loadingStats, setLoadingStats] = useState(true);
	const [myClasses, setMyClasses] = useState<ClassInfo[]>([]);
	const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessment[]>([]);
	const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendance[]>([]);

	// Protect route - only teachers
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch dashboard statistics
	useEffect(() => {
		const fetchStats = async () => {
			if (!user) return;

			try {
				const today = new Date().toISOString().split('T')[0];

				// Get teacher ID
				const { data: teacherData } = await supabase
					.from('teachers')
					.select('id')
					.eq('user_id', user.id)
					.single();

				if (!teacherData) {
					setLoadingStats(false);
					return;
				}

				// Get teacher's assigned classes
				const { data: assignedClasses } = await supabase
					.from('teacher_classes')
					.select(`
						class_id,
						classes (
							id,
							name,
							grade_level
						)
					`)
					.eq('teacher_id', teacherData.id);

				// Get student count for assigned classes only
				const classesWithCount: ClassInfo[] = [];
				if (assignedClasses) {
					for (const assignment of assignedClasses) {
						if (assignment.classes) {
							const { count } = await supabase
								.from('students')
								.select('*', { count: 'exact', head: true })
								.eq('class_id', assignment.classes.id);
							classesWithCount.push({
								id: assignment.classes.id,
								name: assignment.classes.name,
								grade_level: assignment.classes.grade_level,
								studentCount: count || 0,
							});
						}
					}
				}
				setMyClasses(classesWithCount);

				// Get total student count (only from assigned classes)
				const assignedClassIds = classesWithCount.map((c) => c.id);
				const { count: studentCount } = await supabase
					.from('students')
					.select('*', { count: 'exact', head: true })
					.in('class_id', assignedClassIds.length > 0 ? assignedClassIds : ['']);

				const classCount = classesWithCount.length;

				// Get today's attendance stats (only for assigned classes)
				const { data: todayAttendance } = await supabase
					.from('attendance_records')
					.select('status, class_id')
					.eq('date', today)
					.in('class_id', assignedClassIds.length > 0 ? assignedClassIds : ['']);

				const todayPresent = todayAttendance?.filter((a) => a.status === AttendanceStatus.PRESENT).length || 0;
				const todayAbsent = todayAttendance?.filter((a) => a.status === AttendanceStatus.ABSENT).length || 0;
				const todayLate = todayAttendance?.filter((a) => a.status === AttendanceStatus.LATE).length || 0;

				// Get pending leave requests (only for students in assigned classes)
				const { data: pendingLeaves } = await supabase
					.from('leave_applications')
					.select('student_id')
					.eq('status', 'pending');

				let pendingLeaveCount = 0;
				if (pendingLeaves && assignedClassIds.length > 0) {
					const studentIds = pendingLeaves.map((l) => l.student_id);
					const { count } = await supabase
						.from('students')
						.select('*', { count: 'exact', head: true })
						.in('id', studentIds)
						.in('class_id', assignedClassIds);
					pendingLeaveCount = count || 0;
				}

				// Get upcoming assessments (next 30 days, only for assigned classes)
				const thirtyDaysFromNow = new Date();
				thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

				const { data: assessmentClasses } = await supabase
					.from('assessment_classes')
					.select(`
						assessment_id,
						class_id,
						assessments (
							id,
							name,
							assessment_date
						)
					`)
					.in('class_id', assignedClassIds.length > 0 ? assignedClassIds : [''])
					.gte('assessments.assessment_date', today)
					.lte('assessments.assessment_date', thirtyDaysFromNow.toISOString().split('T')[0])
					.order('assessments.assessment_date', { ascending: true })
					.limit(5);

				if (assessmentClasses) {
					const uniqueAssessments = new Map();
					assessmentClasses.forEach((ac: any) => {
						if (ac.assessments && !uniqueAssessments.has(ac.assessments.id)) {
							uniqueAssessments.set(ac.assessments.id, {
								id: ac.assessments.id,
								name: ac.assessments.name,
								assessment_date: ac.assessments.assessment_date,
								class_name: classesWithCount.find((c) => c.id === ac.class_id)?.name || 'N/A',
							});
						}
					});
					setUpcomingAssessments(Array.from(uniqueAssessments.values()).slice(0, 5));
				}

				const upcomingAssessmentCount = assessmentClasses?.length || 0;

				// Get weekly attendance trend (last 7 days, only for assigned classes)
				const last7Days = Array.from({ length: 7 }, (_, i) => {
					const date = new Date();
					date.setDate(date.getDate() - (6 - i));
					return date.toISOString().split('T')[0];
				});

				const weeklyData: WeeklyAttendance[] = [];
				for (const date of last7Days) {
					const { data: dayAttendance } = await supabase
						.from('attendance_records')
						.select('status, class_id')
						.eq('date', date)
						.in('class_id', assignedClassIds.length > 0 ? assignedClassIds : ['']);

					const present = dayAttendance?.filter((a) => a.status === AttendanceStatus.PRESENT).length || 0;
					const absent = dayAttendance?.filter((a) => a.status === AttendanceStatus.ABSENT).length || 0;
					const late = dayAttendance?.filter((a) => a.status === AttendanceStatus.LATE).length || 0;

					weeklyData.push({
						date,
						present,
						absent,
						late,
						total: present + absent + late,
					});
				}
				setWeeklyAttendance(weeklyData);

				setStats({
					totalStudents: studentCount || 0,
					myClasses: classCount || 0,
					todayAttendance: todayPresent + todayAbsent + todayLate,
					todayPresent,
					todayAbsent,
					todayLate,
					pendingGrades: 0, // Placeholder
					upcomingAssessments: upcomingAssessmentCount || 0,
					pendingLeaves: pendingLeaveCount || 0,
				});
			} catch (error) {
				console.error('Error fetching stats:', error);
			} finally {
				setLoadingStats(false);
			}
		};

		fetchStats();
	}, [user]);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push('/auth-pages/login');
	};

	if (loading || !user || role !== UserRole.TEACHER) {
		return null;
	}

	// Chart configurations
	const weeklyAttendanceOptions: ApexOptions = {
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
			categories: weeklyAttendance.map((d) =>
				new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			),
		},
		yaxis: {
			title: { text: 'Number of Students' },
		},
		legend: {
			position: 'top',
		},
		colors: [
			String(process.env.NEXT_PUBLIC_SUCCESS_COLOR),
			String(process.env.NEXT_PUBLIC_DANGER_COLOR),
			String(process.env.NEXT_PUBLIC_WARNING_COLOR),
		],
	};

	const weeklyAttendanceSeries = [
		{ name: 'Present', data: weeklyAttendance.map((d) => d.present) },
		{ name: 'Absent', data: weeklyAttendance.map((d) => d.absent) },
		{ name: 'Late', data: weeklyAttendance.map((d) => d.late) },
	];

	const classDistributionOptions: ApexOptions = {
		chart: {
			type: 'bar',
			height: 300,
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: true,
				dataLabels: {
					position: 'top',
				},
			},
		},
		dataLabels: {
			enabled: true,
		},
		xaxis: {
			categories: myClasses.map((c) => `${c.grade_level} ${c.name}`),
		},
		colors: [String(process.env.NEXT_PUBLIC_INFO_COLOR)],
	};

	const classDistributionSeries = [
		{ name: 'Students', data: myClasses.map((c) => c.studentCount) },
	];

	return (
		<PageWrapper>
			<Head>
				<title>Teacher Dashboard - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<span className='h4 mb-0 fw-bold'>Teacher Dashboard</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<span className='text-muted me-3'>Welcome, {profile?.full_name}</span>
					<Button color='danger' isLight icon='Logout' onClick={handleSignOut}>
						Sign Out
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				{/* Statistics Cards Row 1 */}
				<div className='row mb-4'>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/teacher/students')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='School' size='3x' color='success' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.totalStudents}
									</div>
									<div className='text-muted'>Total Students</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='Class' size='3x' color='primary' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.myClasses}
									</div>
									<div className='text-muted'>My Classes</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='bg-l10-success'>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='CheckCircle' size='3x' color='success' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.todayAttendance > 0
											? `${Math.round((stats.todayPresent / stats.todayAttendance) * 100)}%`
											: 'N/A'}
									</div>
									<div className='text-muted'>Today's Attendance</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/teacher/assessments')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='Assignment' size='3x' color='warning' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.upcomingAssessments}
									</div>
									<div className='text-muted'>Upcoming Assessments</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Statistics Cards Row 2 */}
				<div className='row mb-4'>
					<div className='col-lg-4 col-md-6 mb-3'>
						<Card stretch>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='CheckCircle' size='2x' color='success' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-4 mb-0'>
										{loadingStats ? '...' : stats.todayPresent}
									</div>
									<div className='text-muted small'>Present Today</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 col-md-6 mb-3'>
						<Card stretch>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='Cancel' size='2x' color='danger' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-4 mb-0'>
										{loadingStats ? '...' : stats.todayAbsent}
									</div>
									<div className='text-muted small'>Absent Today</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/teacher/leave')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='EventNote' size='2x' color='info' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-4 mb-0'>
										{loadingStats ? '...' : stats.pendingLeaves}
									</div>
									<div className='text-muted small'>Pending Leave Requests</div>
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
									<CardTitle>Weekly Attendance Trend</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-5'>
										<div className='spinner-border text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : (
									<Chart
										series={weeklyAttendanceSeries}
										options={weeklyAttendanceOptions}
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
								<CardLabel icon='BarChart'>
									<CardTitle>My Classes</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-5'>
										<div className='spinner-border text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : myClasses.length === 0 ? (
									<div className='text-center py-5'>
										<Icon icon='Info' size='3x' color='info' className='mb-3' />
										<p className='text-muted'>No classes assigned</p>
									</div>
								) : (
									<Chart
										series={classDistributionSeries}
										options={classDistributionOptions}
										type='bar'
										height={300}
									/>
								)}
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Quick Actions */}
				<div className='row mb-4'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Dashboard'>
									<CardTitle>Quick Actions</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='row g-3'>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='primary'
											isLight
											className='w-100 p-3'
											icon='CheckCircle'
											onClick={() => router.push('/teacher/attendance/mark')}>
											<div className='mt-2 small'>Mark Attendance</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='success'
											isLight
											className='w-100 p-3'
											icon='Assignment'
											onClick={() => router.push('/teacher/assessments')}>
											<div className='mt-2 small'>Assessments</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='info'
											isLight
											className='w-100 p-3'
											icon='Grade'
											onClick={() => router.push('/teacher/grades')}>
											<div className='mt-2 small'>Enter Grades</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='warning'
											isLight
											className='w-100 p-3'
											icon='School'
											onClick={() => router.push('/teacher/students')}>
											<div className='mt-2 small'>View Students</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='secondary'
											isLight
											className='w-100 p-3'
											icon='EventNote'
											onClick={() => router.push('/teacher/leave')}>
											<div className='mt-2 small'>Leave Requests</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='danger'
											isLight
											className='w-100 p-3'
											icon='Campaign'
											onClick={() => router.push('/teacher/announcements')}>
											<div className='mt-2 small'>Announcements</div>
										</Button>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Upcoming Assessments & Management */}
				<div className='row'>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='Assignment'>
									<CardTitle>Upcoming Assessments</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-3'>
										<div className='spinner-border spinner-border-sm text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : upcomingAssessments.length === 0 ? (
									<p className='text-muted text-center'>No upcoming assessments</p>
								) : (
									<div className='d-flex flex-column gap-3'>
										{upcomingAssessments.map((assessment) => (
											<div key={assessment.id} className='border-bottom pb-2'>
												<div className='fw-bold'>{assessment.name}</div>
												<div className='small text-muted'>
													{new Date(assessment.assessment_date).toLocaleDateString()}
												</div>
												<Badge color='info' isLight className='mt-1'>
													{assessment.class_name}
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
										onClick={() => router.push('/teacher/assessments')}>
										View All Assessments
									</Button>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='School'>
									<CardTitle>Student Management</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='d-grid gap-2'>
									<Button
										color='primary'
										isOutline
										icon='School'
										onClick={() => router.push('/teacher/students')}>
										View All Students
									</Button>
									<Button
										color='primary'
										isOutline
										icon='PersonAdd'
										onClick={() => router.push('/teacher/students/create')}>
										Add New Student
									</Button>
									<Button
										color='primary'
										isOutline
										icon='CheckCircle'
										onClick={() => router.push('/teacher/attendance')}>
										Attendance Records
									</Button>
									<Button
										color='primary'
										isOutline
										icon='BarChart'
										onClick={() => router.push('/teacher/reports/attendance')}>
										Attendance Reports
									</Button>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='Assessment'>
									<CardTitle>Academic Management</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='d-grid gap-2'>
									<Button
										color='success'
										isOutline
										icon='Assignment'
										onClick={() => router.push('/teacher/assessments')}>
										Manage Assessments
									</Button>
									<Button
										color='success'
										isOutline
										icon='Grade'
										onClick={() => router.push('/teacher/grades')}>
										Enter Grades
									</Button>
									<Button
										color='success'
										isOutline
										icon='BarChart'
										onClick={() => router.push('/teacher/reports/academic')}>
										Academic Reports
									</Button>
									<Button
										color='success'
										isOutline
										icon='Event'
										onClick={() => router.push('/teacher/calendar')}>
										Calendar
									</Button>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>
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

export default TeacherDashboard;

