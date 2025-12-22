/**
 * Admin - Attendance Reports
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
import { UserRole, Class, AttendanceStatus } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface AttendanceRecord {
	id: string;
	date: string;
	status: AttendanceStatus;
	student: {
		id: string;
		full_name: string;
		admission_number: string;
	};
}

const AttendanceReportsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [classes, setClasses] = useState<Class[]>([]);
	const [selectedClassId, setSelectedClassId] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
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

	const handleGenerateReport = async () => {
		if (!selectedClassId || !startDate || !endDate) {
			showNotification('Validation Error', 'Please select class and date range', 'warning');
			return;
		}

		setLoadingData(true);
		try {
			const { data, error } = await supabase
				.from('attendance_records')
				.select(`
					id,
					date,
					status,
					student:students(id, full_name, admission_number)
				`)
				.eq('class_id', selectedClassId)
				.gte('date', startDate)
				.lte('date', endDate)
				.order('date', { ascending: false });

			if (error) throw error;
			setAttendanceRecords(data || []);
			showNotification('Success', 'Report generated successfully', 'success');
		} catch (error) {
			console.error('Error generating report:', error);
			showNotification('Error', 'Failed to generate report', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	const handleExportToCSV = () => {
		if (attendanceRecords.length === 0) {
			showNotification('No Data', 'No records to export', 'warning');
			return;
		}

		const headers = ['Date', 'Admission Number', 'Student Name', 'Status'];
		const csvData = attendanceRecords.map((record) => [
			new Date(record.date).toLocaleDateString(),
			record.student.admission_number,
			record.student.full_name,
			record.status,
		]);

		const csvContent = [
			headers.join(','),
			...csvData.map((row) => row.join(',')),
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		showNotification('Success', 'Report exported successfully', 'success');
	};

	// Filter records by search term
	const filteredRecords = attendanceRecords.filter((record) =>
		record.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		record.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Calculate statistics
	const stats = {
		total: filteredRecords.length,
		present: filteredRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length,
		absent: filteredRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length,
		late: filteredRecords.filter((r) => r.status === AttendanceStatus.LATE).length,
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Attendance Reports - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Attendance Reports</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{attendanceRecords.length > 0 && (
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
									<div className='col-md-3'>
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
									<div className='col-md-3'>
										<FormGroup id='startDate' label='Start Date'>
											<Input
												type='date'
												value={startDate}
												onChange={(e: any) => setStartDate(e.target.value)}
											/>
										</FormGroup>
									</div>
									<div className='col-md-3'>
										<FormGroup id='endDate' label='End Date'>
											<Input
												type='date'
												value={endDate}
												onChange={(e: any) => setEndDate(e.target.value)}
											/>
										</FormGroup>
									</div>
									<div className='col-md-3 d-flex align-items-end'>
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
				{attendanceRecords.length > 0 && (
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
													className='bi bi-list-check'
													viewBox='0 0 16 16'>
													<path d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3.854 2.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 3.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 7.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z' />
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Total Records</div>
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
											<div className='text-muted small'>Present</div>
											<div className='fw-bold h4 mb-0'>{stats.present}</div>
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
											<div className='text-muted small'>Absent</div>
											<div className='fw-bold h4 mb-0'>{stats.absent}</div>
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
											<div className='bg-l10-warning text-warning rounded-2 p-3'>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													width='32'
													height='32'
													fill='currentColor'
													className='bi bi-clock'
													viewBox='0 0 16 16'>
													<path d='M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z' />
													<path d='M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z' />
												</svg>
											</div>
										</div>
										<div className='flex-grow-1 ms-3'>
											<div className='text-muted small'>Late</div>
											<div className='fw-bold h4 mb-0'>{stats.late}</div>
										</div>
									</div>
								</CardBody>
							</Card>
						</div>
					</div>
				)}

				{/* Records Table */}
				{attendanceRecords.length > 0 && (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardHeader>
									<CardLabel icon='TableChart'>
										<CardTitle>Attendance Records</CardTitle>
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
												<th>Date</th>
												<th>Admission Number</th>
												<th>Student Name</th>
												<th>Status</th>
											</tr>
										</thead>
										<tbody>
											{filteredRecords.map((record) => (
												<tr key={record.id}>
													<td>{new Date(record.date).toLocaleDateString()}</td>
													<td>{record.student.admission_number}</td>
													<td>{record.student.full_name}</td>
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

export default AttendanceReportsPage;


