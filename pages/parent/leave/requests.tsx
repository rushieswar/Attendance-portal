/**
 * Parent - View Leave Requests
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
import Input from '../../../components/bootstrap/forms/Input';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface LeaveRequest {
	id: string;
	start_date: string;
	end_date: string;
	reason: string;
	status: 'pending' | 'approved' | 'rejected';
	created_at: string;
	student: {
		id: string;
		full_name: string;
		admission_number: string;
	};
}

const LeaveRequestsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.PARENT)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch leave requests
	useEffect(() => {
		const fetchLeaveRequests = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('leave_applications')
					.select(`
						id,
						start_date,
						end_date,
						reason,
						status,
						created_at,
						student:students(id, full_name, admission_number)
					`)
					.eq('applied_by', user.id)
					.order('created_at', { ascending: false });

				if (error) throw error;
				setLeaveRequests(data || []);
			} catch (error) {
				console.error('Error fetching leave requests:', error);
				showNotification('Error', 'Failed to load leave requests', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchLeaveRequests();
	}, [user]);

	// Filter requests by search term
	const filteredRequests = leaveRequests.filter((request) =>
		request.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		request.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
	);

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

	if (loading || !user || role !== UserRole.PARENT) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Leave Requests - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/parent/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>My Leave Requests</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button color='primary' icon='AddCircle' onClick={() => router.push('/parent/leave/apply')}>
						Apply for Leave
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='ListAlt'>
									<CardTitle>Leave Requests</CardTitle>
								</CardLabel>
								<div className='col-md-4'>
									<Input
										type='search'
										placeholder='Search by student name or admission number...'
										value={searchTerm}
										onChange={(e: any) => setSearchTerm(e.target.value)}
									/>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredRequests.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm ? 'No requests found matching your search' : 'No leave requests found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Student</th>
												<th>Start Date</th>
												<th>End Date</th>
												<th>Reason</th>
												<th>Status</th>
												<th>Requested On</th>
											</tr>
										</thead>
										<tbody>
											{filteredRequests.map((request) => (
												<tr key={request.id}>
													<td>
														<div>{request.student.full_name}</div>
														<small className='text-muted'>{request.student.admission_number}</small>
													</td>
													<td>{new Date(request.start_date).toLocaleDateString()}</td>
													<td>{new Date(request.end_date).toLocaleDateString()}</td>
													<td>
														<div style={{ maxWidth: '300px' }} className='text-truncate'>
															{request.reason}
														</div>
													</td>
													<td>{getStatusBadge(request.status)}</td>
													<td>{new Date(request.created_at).toLocaleDateString()}</td>
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

export default LeaveRequestsPage;

