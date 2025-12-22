/**
 * Admin - Manage Leave Applications
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
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import Textarea from '../../../components/bootstrap/forms/Textarea';
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

const AdminLeaveManagementPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
	const [reviewRemarks, setReviewRemarks] = useState('');
	const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch leave applications
	const fetchLeaveApplications = async () => {
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
			app.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
			app.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const handleReview = (application: LeaveApplication, action: 'approved' | 'rejected') => {
		setSelectedApplication(application);
		setReviewAction(action);
		setReviewRemarks('');
		setReviewModalOpen(true);
	};

	const submitReview = async () => {
		if (!selectedApplication) return;

		try {
			const { error } = await supabase
				.from('leave_applications')
				.update({
					status: reviewAction,
					reviewed_by: user?.id,
					reviewed_at: new Date().toISOString(),
					review_remarks: reviewRemarks || null,
				})
				.eq('id', selectedApplication.id);

			if (error) throw error;

			showNotification(
				'Success',
				`Leave application ${reviewAction} successfully`,
				'success'
			);
			setReviewModalOpen(false);
			setSelectedApplication(null);
			fetchLeaveApplications();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

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

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Leave Applications - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Leave Applications</span>
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
											placeholder='Search by student, admission no, or parent...'
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
												<th className='text-end'>Actions</th>
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
													<td className='text-end'>
														{application.status === 'pending' ? (
															<>
																<Button
																	icon='CheckCircle'
																	color='success'
																	isLight
																	size='sm'
																	className='me-2'
																	onClick={() => handleReview(application, 'approved')}>
																	Approve
																</Button>
																<Button
																	icon='Cancel'
																	color='danger'
																	isLight
																	size='sm'
																	onClick={() => handleReview(application, 'rejected')}>
																	Reject
																</Button>
															</>
														) : (
															<span className='text-muted'>Reviewed</span>
														)}
													</td>
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

			{/* Review Modal */}
			<Modal isOpen={reviewModalOpen} setIsOpen={setReviewModalOpen} size='lg' titleId='review-modal'>
				<ModalHeader setIsOpen={setReviewModalOpen}>
					<ModalTitle id='review-modal'>
						{reviewAction === 'approved' ? 'Approve' : 'Reject'} Leave Application
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					{selectedApplication && (
						<div>
							<div className='mb-3'>
								<strong>Student:</strong> {selectedApplication.student.full_name}
							</div>
							<div className='mb-3'>
								<strong>Leave Period:</strong>{' '}
								{new Date(selectedApplication.start_date).toLocaleDateString()} to{' '}
								{new Date(selectedApplication.end_date).toLocaleDateString()}
							</div>
							<div className='mb-3'>
								<strong>Reason:</strong>
								<p className='mt-2'>{selectedApplication.reason}</p>
							</div>
							<div className='mb-3'>
								<label className='form-label'>Remarks (Optional)</label>
								<Textarea
									value={reviewRemarks}
									onChange={(e: any) => setReviewRemarks(e.target.value)}
									rows={3}
									placeholder='Add any remarks or comments...'
								/>
							</div>
						</div>
					)}
				</ModalBody>
				<ModalFooter>
					<Button color='secondary' isOutline onClick={() => setReviewModalOpen(false)}>
						Cancel
					</Button>
					<Button
						color={reviewAction === 'approved' ? 'success' : 'danger'}
						onClick={submitReview}>
						{reviewAction === 'approved' ? 'Approve' : 'Reject'}
					</Button>
				</ModalFooter>
			</Modal>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default AdminLeaveManagementPage;

