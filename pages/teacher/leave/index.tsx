/**
 * Teacher - View Leave Applications
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface LeaveApplication {
	id: string;
	start_date: string;
	end_date: string;
	reason: string;
	status: 'pending' | 'approved' | 'rejected';
	created_at: string;
	review_remarks: string | null;
	student: {
		id: string;
		full_name: string;
		admission_number: string;
		class: {
			name: string;
			grade_level: string;
		};
	};
	parent: {
		full_name: string;
		phone: string;
	};
}

const TeacherLeaveRequestsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch leave applications for students in teacher's classes
	const fetchLeaveApplications = async () => {
		try {
			// Note: In a real implementation, you'd filter by classes the teacher teaches
			// For now, we'll show all leave applications
			const { data, error } = await supabase
				.from('leave_applications')
				.select(`
					id,
					start_date,
					end_date,
					reason,
					status,
					created_at,
					review_remarks,
					student:students(
						id,
						full_name,
						admission_number,
						class:classes(name, grade_level)
					),
					parent:profiles!leave_applications_applied_by_fkey(full_name, phone)
				`)
				.order('created_at', { ascending: false });

			if (error) throw error;
			setLeaveApplications(data || []);
		} catch (error) {
			console.error('Error fetching leave applications:', error);
			showNotification('Error', 'Failed to load leave applications', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchLeaveApplications();
	}, [user]);

	// Filter applications
	const filteredApplications = leaveApplications.filter((app) => {
		const matchesSearch =
			app.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			app.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'approved':
				return <span className='badge bg-success'>Approved</span>;
			case 'rejected':
				return <span className='badge bg-danger'>Rejected</span>;
			case 'pending':
			default:
				return <span className='badge bg-warning'>Pending</span>;
		}
	};

	if (loading || !user || role !== UserRole.TEACHER) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Leave Applications - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Student Leave Applications</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='EventNote'>
									<CardTitle>Leave Applications</CardTitle>
								</CardLabel>
								<div className='d-flex gap-3'>
									<div className='col-md-4'>
										<Input
											type='search'
											placeholder='Search by student name or admission no...'
											value={searchTerm}
											onChange={(e: any) => setSearchTerm(e.target.value)}
										/>
									</div>
									<div className='col-md-2'>
										<Select
											value={statusFilter}
											onChange={(e: any) => setStatusFilter(e.target.value)}
											ariaLabel='Filter by status'>
											<option value='all'>All Status</option>
											<option value='pending'>Pending</option>
											<option value='approved'>Approved</option>
											<option value='rejected'>Rejected</option>
										</Select>
									</div>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredApplications.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm || statusFilter !== 'all'
											? 'No applications found matching your filters'
											: 'No leave applications found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Student</th>
												<th>Class</th>
												<th>Parent</th>
												<th>Leave Period</th>
												<th>Reason</th>
												<th>Status</th>
												<th>Applied On</th>
											</tr>
										</thead>
										<tbody>
											{filteredApplications.map((application) => (
												<tr key={application.id}>
													<td>
														<div className='fw-bold'>{application.student.full_name}</div>
														<small className='text-muted'>{application.student.admission_number}</small>
													</td>
													<td>
														{application.student.class?.name} - {application.student.class?.grade_level}
													</td>
													<td>
														<div>{application.parent.full_name}</div>
														<small className='text-muted'>{application.parent.phone}</small>
													</td>
													<td>
														<div>{new Date(application.start_date).toLocaleDateString()}</div>
														<small className='text-muted'>
															to {new Date(application.end_date).toLocaleDateString()}
														</small>
													</td>
													<td>
														<div style={{ maxWidth: '200px' }} className='text-truncate'>
															{application.reason}
														</div>
													</td>
													<td>{getStatusBadge(application.status)}</td>
													<td>{new Date(application.created_at).toLocaleDateString()}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
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

export default TeacherLeaveRequestsPage;
