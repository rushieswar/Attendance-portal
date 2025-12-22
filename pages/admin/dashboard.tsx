/**
 * Super Admin Dashboard
 * Full system access and management
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

interface AttendanceTrend {
	date: string;
	present: number;
	absent: number;
	late: number;
}

interface ClassDistribution {
	name: string;
	studentCount: number;
}

interface RecentActivity {
	id: string;
	type: string;
	description: string;
	timestamp: string;
	icon: string;
	color: string;
}

const AdminDashboard: NextPage = () => {
	const router = useRouter();
	const { user, profile, loading, role } = useAuth();
	const [stats, setStats] = useState({
		totalTeachers: 0,
		totalStudents: 0,
		totalParents: 0,
		totalClasses: 0,
		totalSubjects: 0,
		activeAcademicYear: '',
		todayPresent: 0,
		todayAbsent: 0,
		todayLate: 0,
		pendingLeaves: 0,
		upcomingAssessments: 0,
		classesWithAttendance: 0,
		classesPendingAttendance: 0,
	});
	const [loadingStats, setLoadingStats] = useState(true);
	const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);
	const [classDistribution, setClassDistribution] = useState<ClassDistribution[]>([]);
	const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

	// Protect route - only super admins
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch dashboard statistics
	useEffect(() => {
		const fetchStats = async () => {
			if (!user) return;

			try {
				const today = new Date().toISOString().split('T')[0];

				// Get teacher count
				const { count: teacherCount } = await supabase
					.from('teachers')
					.select('*', { count: 'exact', head: true });

				// Get student count
				const { count: studentCount } = await supabase
					.from('students')
					.select('*', { count: 'exact', head: true });

				// Get parent count
				const { count: parentCount } = await supabase
					.from('profiles')
					.select('*', { count: 'exact', head: true })
					.eq('role', UserRole.PARENT);

				// Get class count
				const { count: classCount } = await supabase
					.from('classes')
					.select('*', { count: 'exact', head: true });

				// Get subject count
				const { count: subjectCount } = await supabase
					.from('subjects')
					.select('*', { count: 'exact', head: true });

				// Get current academic year
				const { data: currentYear } = await supabase
					.from('academic_years')
					.select('name')
					.eq('is_current', true)
					.single();

				// Get today's attendance stats
				const { data: todayAttendance } = await supabase
					.from('attendance_records')
					.select('status')
					.eq('date', today);

				const todayPresent = todayAttendance?.filter((a) => a.status === AttendanceStatus.PRESENT).length || 0;
				const todayAbsent = todayAttendance?.filter((a) => a.status === AttendanceStatus.ABSENT).length || 0;
				const todayLate = todayAttendance?.filter((a) => a.status === AttendanceStatus.LATE).length || 0;

				// Get pending leave requests
				const { count: pendingLeaveCount } = await supabase
					.from('leave_applications')
					.select('*', { count: 'exact', head: true })
					.eq('status', LeaveStatus.PENDING);

				// Get upcoming assessments (next 30 days)
				const thirtyDaysFromNow = new Date();
				thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
				const { count: upcomingAssessmentCount } = await supabase
					.from('assessments')
					.select('*', { count: 'exact', head: true })
					.gte('assessment_date', today)
					.lte('assessment_date', thirtyDaysFromNow.toISOString().split('T')[0]);

				// Get classes with attendance marked today
				// Get all classes
				const { data: allClasses } = await supabase
					.from('classes')
					.select('id');

				// For each class, check if attendance has been marked today
				let classesWithAttendanceCount = 0;
				if (allClasses) {
					for (const classItem of allClasses) {
						const { data: classAttendance } = await supabase
							.from('attendance_records')
							.select('id', { count: 'exact', head: true })
							.eq('class_id', classItem.id)
							.eq('date', today)
							.limit(1);

						if (classAttendance !== null) {
							classesWithAttendanceCount++;
						}
					}
				}

				const classesPendingAttendanceCount = (classCount || 0) - classesWithAttendanceCount;

				setStats({
					totalTeachers: teacherCount || 0,
					totalStudents: studentCount || 0,
					totalParents: parentCount || 0,
					totalClasses: classCount || 0,
					totalSubjects: subjectCount || 0,
					activeAcademicYear: currentYear?.name || 'N/A',
					todayPresent,
					todayAbsent,
					todayLate,
					pendingLeaves: pendingLeaveCount || 0,
					upcomingAssessments: upcomingAssessmentCount || 0,
					classesWithAttendance: classesWithAttendanceCount,
					classesPendingAttendance: classesPendingAttendanceCount,
				});

				// Fetch attendance trend for last 7 days
				const last7Days = Array.from({ length: 7 }, (_, i) => {
					const date = new Date();
					date.setDate(date.getDate() - (6 - i));
					return date.toISOString().split('T')[0];
				});

				const trendData: AttendanceTrend[] = [];
				for (const date of last7Days) {
					const { data: dayAttendance } = await supabase
						.from('attendance_records')
						.select('status')
						.eq('date', date);

					trendData.push({
						date,
						present: dayAttendance?.filter((a) => a.status === AttendanceStatus.PRESENT).length || 0,
						absent: dayAttendance?.filter((a) => a.status === AttendanceStatus.ABSENT).length || 0,
						late: dayAttendance?.filter((a) => a.status === AttendanceStatus.LATE).length || 0,
					});
				}
				setAttendanceTrend(trendData);

				// Fetch class distribution
				const { data: classes } = await supabase
					.from('classes')
					.select('id, name, grade_level');

				if (classes) {
					const distribution: ClassDistribution[] = [];
					for (const cls of classes) {
						const { count } = await supabase
							.from('students')
							.select('*', { count: 'exact', head: true })
							.eq('class_id', cls.id);
						distribution.push({
							name: `${cls.grade_level} ${cls.name}`,
							studentCount: count || 0,
						});
					}
					setClassDistribution(distribution);
				}

				// Fetch recent activities (mock data for now)
				const activities: RecentActivity[] = [
					{
						id: '1',
						type: 'attendance',
						description: classesPendingAttendanceCount > 0
							? `${classesPendingAttendanceCount} classes pending attendance today`
							: 'All classes attendance marked today',
						timestamp: new Date().toISOString(),
						icon: classesPendingAttendanceCount > 0 ? 'PendingActions' : 'CheckCircle',
						color: classesPendingAttendanceCount > 0 ? 'warning' : 'success',
					},
					{
						id: '2',
						type: 'student',
						description: `${studentCount} students enrolled`,
						timestamp: new Date().toISOString(),
						icon: 'School',
						color: 'success',
					},
					{
						id: '3',
						type: 'leave',
						description: `${pendingLeaveCount} pending leave requests`,
						timestamp: new Date().toISOString(),
						icon: 'EventNote',
						color: 'warning',
					},
					{
						id: '4',
						type: 'assessment',
						description: `${upcomingAssessmentCount} upcoming assessments`,
						timestamp: new Date().toISOString(),
						icon: 'Assignment',
						color: 'info',
					},
				];
				setRecentActivities(activities);
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

	if (loading || !user || role !== UserRole.SUPER_ADMIN) {
		return null;
	}

	// Chart configurations
	const attendanceTrendOptions: ApexOptions = {
		chart: {
			type: 'line',
			height: 300,
			toolbar: { show: false },
		},
		stroke: {
			curve: 'smooth',
			width: 3,
		},
		xaxis: {
			categories: attendanceTrend.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
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

	const attendanceTrendSeries = [
		{ name: 'Present', data: attendanceTrend.map((d) => d.present) },
		{ name: 'Absent', data: attendanceTrend.map((d) => d.absent) },
		{ name: 'Late', data: attendanceTrend.map((d) => d.late) },
	];

	const classDistributionOptions: ApexOptions = {
		chart: {
			type: 'bar',
			height: 300,
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: '55%',
			},
		},
		dataLabels: {
			enabled: false,
		},
		xaxis: {
			categories: classDistribution.map((c) => c.name),
		},
		yaxis: {
			title: { text: 'Number of Students' },
		},
		colors: [String(process.env.NEXT_PUBLIC_PRIMARY_COLOR)],
	};

	const classDistributionSeries = [
		{ name: 'Students', data: classDistribution.map((c) => c.studentCount) },
	];

	const todayAttendanceOptions: ApexOptions = {
		chart: {
			type: 'donut',
			height: 300,
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

	const todayAttendanceSeries = [stats.todayPresent, stats.todayAbsent, stats.todayLate];

	return (
		<PageWrapper>
			<Head>
				<title>Admin Dashboard - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<span className='h4 mb-0 fw-bold'>Super Admin Dashboard</span>
					<Badge color='info' className='ms-3'>
						{stats.activeAcademicYear}
					</Badge>
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
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/teachers')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='People' size='3x' color='primary' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.totalTeachers}
									</div>
									<div className='text-muted'>Total Teachers</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/students')}>
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
									<Icon icon='FamilyRestroom' size='3x' color='info' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.totalParents}
									</div>
									<div className='text-muted'>Total Parents</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/classes')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='Class' size='3x' color='warning' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.totalClasses}
									</div>
									<div className='text-muted'>Total Classes</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Statistics Cards Row 2 */}
				<div className='row mb-4'>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/subjects')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='MenuBook' size='3x' color='secondary' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.totalSubjects}
									</div>
									<div className='text-muted'>Total Subjects</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/leave')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='EventNote' size='3x' color='warning' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.pendingLeaves}
									</div>
									<div className='text-muted'>Pending Leaves</div>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='cursor-pointer' onClick={() => router.push('/admin/assessments')}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='Assignment' size='3x' color='info' />
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
					<div className='col-lg-3 col-md-6 mb-3'>
						<Card stretch className='bg-l10-success'>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='CheckCircle' size='3x' color='success' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.todayPresent + stats.todayAbsent + stats.todayLate > 0
											? `${Math.round((stats.todayPresent / (stats.todayPresent + stats.todayAbsent + stats.todayLate)) * 100)}%`
											: 'N/A'}
									</div>
									<div className='text-muted'>Today's Attendance</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Attendance Completion Status Row */}
				<div className='row mb-4'>
					<div className='col-lg-6 col-md-6 mb-3'>
						<Card stretch className='bg-l10-info'>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon icon='FactCheck' size='3x' color='info' />
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : `${stats.classesWithAttendance} / ${stats.totalClasses}`}
									</div>
									<div className='text-muted'>Classes with Attendance Marked Today</div>
									{!loadingStats && stats.totalClasses > 0 && (
										<div className='mt-2'>
											<div className='progress' style={{ height: '8px' }}>
												<div
													className='progress-bar bg-info'
													role='progressbar'
													style={{
														width: `${(stats.classesWithAttendance / stats.totalClasses) * 100}%`,
													}}
													aria-valuenow={(stats.classesWithAttendance / stats.totalClasses) * 100}
													aria-valuemin={0}
													aria-valuemax={100}
												/>
											</div>
										</div>
									)}
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-6 col-md-6 mb-3'>
						<Card stretch className={stats.classesPendingAttendance > 0 ? 'bg-l10-warning' : 'bg-l10-success'}>
							<CardBody className='d-flex align-items-center'>
								<div className='flex-shrink-0'>
									<Icon
										icon={stats.classesPendingAttendance > 0 ? 'PendingActions' : 'CheckCircle'}
										size='3x'
										color={stats.classesPendingAttendance > 0 ? 'warning' : 'success'}
									/>
								</div>
								<div className='flex-grow-1 ms-3'>
									<div className='fw-bold fs-3 mb-0'>
										{loadingStats ? '...' : stats.classesPendingAttendance}
									</div>
									<div className='text-muted'>
										{stats.classesPendingAttendance === 0
											? 'All Classes Attendance Marked!'
											: 'Classes Pending Attendance Today'}
									</div>
									{!loadingStats && stats.classesPendingAttendance > 0 && (
										<Button
											color='warning'
											size='sm'
											className='mt-2'
											icon='Edit'
											onClick={() => router.push('/admin/attendance/mark')}>
											Mark Attendance
										</Button>
									)}
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
									<CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
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
										series={attendanceTrendSeries}
										options={attendanceTrendOptions}
										type='line'
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
									<CardTitle>Today's Attendance</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-5'>
										<div className='spinner-border text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : stats.todayPresent + stats.todayAbsent + stats.todayLate === 0 ? (
									<div className='text-center py-5'>
										<Icon icon='Info' size='3x' color='info' className='mb-3' />
										<p className='text-muted'>No attendance marked today</p>
									</div>
								) : (
									<Chart
										series={todayAttendanceSeries}
										options={todayAttendanceOptions}
										type='donut'
										height={300}
									/>
								)}
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Class Distribution Chart */}
				<div className='row mb-4'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='BarChart'>
									<CardTitle>Student Distribution by Class</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-5'>
										<div className='spinner-border text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : classDistribution.length === 0 ? (
									<div className='text-center py-5'>
										<Icon icon='Info' size='3x' color='info' className='mb-3' />
										<p className='text-muted'>No classes available</p>
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
											icon='PersonAdd'
											onClick={() => router.push('/admin/teachers/create')}>
											<div className='mt-2 small'>Add Teacher</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='success'
											isLight
											className='w-100 p-3'
											icon='PersonAdd'
											onClick={() => router.push('/admin/students/create')}>
											<div className='mt-2 small'>Add Student</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='info'
											isLight
											className='w-100 p-3'
											icon='EditCalendar'
											onClick={() => router.push('/admin/attendance/mark')}>
											<div className='mt-2 small'>Mark Attendance</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='warning'
											isLight
											className='w-100 p-3'
											icon='Assignment'
											onClick={() => router.push('/admin/assessments')}>
											<div className='mt-2 small'>Assessments</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='secondary'
											isLight
											className='w-100 p-3'
											icon='Event'
											onClick={() => router.push('/admin/calendar')}>
											<div className='mt-2 small'>Calendar</div>
										</Button>
									</div>
									<div className='col-lg-2 col-md-4 col-sm-6'>
										<Button
											color='danger'
											isLight
											className='w-100 p-3'
											icon='Campaign'
											onClick={() => router.push('/admin/announcements')}>
											<div className='mt-2 small'>Announcements</div>
										</Button>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Management Sections */}
				<div className='row'>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='School'>
									<CardTitle>Academic Management</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='d-grid gap-2'>
									<Button
										color='primary'
										isOutline
										icon='Event'
										onClick={() => router.push('/admin/academic-years')}>
										Academic Years
									</Button>
									<Button
										color='primary'
										isOutline
										icon='Class'
										onClick={() => router.push('/admin/classes')}>
										Classes
									</Button>
									<Button
										color='primary'
										isOutline
										icon='MenuBook'
										onClick={() => router.push('/admin/subjects')}>
										Subjects
									</Button>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='Assessment'>
									<CardTitle>Reports & Analytics</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div className='d-grid gap-2'>
									<Button
										color='success'
										isOutline
										icon='BarChart'
										onClick={() => router.push('/admin/reports/attendance')}>
										Attendance Reports
									</Button>
									<Button
										color='success'
										isOutline
										icon='Assessment'
										onClick={() => router.push('/admin/reports/academic')}>
										Academic Reports
									</Button>
									<Button
										color='success'
										isOutline
										icon='TrendingUp'
										onClick={() => router.push('/admin/reports/attendance')}>
										Performance Analytics
									</Button>
								</div>
							</CardBody>
						</Card>
					</div>
					<div className='col-lg-4 mb-3'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='Notifications'>
									<CardTitle>Recent Activities</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingStats ? (
									<div className='text-center py-3'>
										<div className='spinner-border spinner-border-sm text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : recentActivities.length === 0 ? (
									<p className='text-muted text-center'>No recent activities</p>
								) : (
									<div className='d-flex flex-column gap-3'>
										{recentActivities.map((activity) => (
											<div key={activity.id} className='d-flex align-items-start'>
												<Icon
													icon={activity.icon}
													color={activity.color}
													size='lg'
													className='me-2'
												/>
												<div className='flex-grow-1'>
													<div className='small'>{activity.description}</div>
													<div className='text-muted' style={{ fontSize: '0.75rem' }}>
														{new Date(activity.timestamp).toLocaleString()}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
								<div className='mt-3'>
									<Button
										color='info'
										isOutline
										icon='Settings'
										className='w-100'
										onClick={() => router.push('/admin/settings')}>
										School Settings
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

export default AdminDashboard;

