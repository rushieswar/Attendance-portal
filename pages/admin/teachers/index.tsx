/**
 * Admin - Teachers List & Management
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

interface Teacher {
	id: string;
	employee_id: string;
	subjects: string[];
	joining_date: string;
	user: {
		full_name: string;
		phone: string | null;
		email: string;
		is_active: boolean;
	};
}

const AdminTeachersPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch teachers
	const fetchTeachers = async () => {
		try {
			const { data, error } = await supabase
				.from('teachers')
				.select(`
					id,
					employee_id,
					subjects,
					joining_date,
					user:profiles!teachers_user_id_fkey(
						full_name,
						phone,
						email:id,
						is_active
					)
				`)
				.order('employee_id');

			if (error) throw error;

			// Fetch emails for each teacher via API route
			const teachersWithEmails = await Promise.all(
				(data || []).map(async (teacher) => {
					try {
						const response = await fetch(`/api/users/get-email?userId=${teacher.user.email}`);
						if (response.ok) {
							const { email } = await response.json();
							return {
								...teacher,
								user: {
									...teacher.user,
									email: email || 'N/A',
								},
							};
						}
					} catch (err) {
						console.error('Error fetching email for teacher:', teacher.id, err);
					}
					// Fallback if API call fails
					return {
						...teacher,
						user: {
							...teacher.user,
							email: 'N/A',
						},
					};
				})
			);

			setTeachers(teachersWithEmails);
		} catch (error) {
			console.error('Error fetching teachers:', error);
			showNotification('Error', 'Failed to load teachers', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchTeachers();
	}, [user]);

	// Filter teachers
	const filteredTeachers = teachers.filter((teacher) => {
		const matchesSearch =
			teacher.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			teacher.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
			teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesSearch;
	});

	const handleToggleStatus = async (teacherId: string, userId: string, currentStatus: boolean) => {
		try {
			const { error } = await supabase
				.from('profiles')
				.update({ is_active: !currentStatus })
				.eq('id', userId);

			if (error) throw error;
			showNotification(
				'Success',
				`Teacher ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
				'success'
			);
			fetchTeachers();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleDelete = async (teacherId: string, teacherName: string) => {
		if (!confirm(`Are you sure you want to delete ${teacherName}? This will also delete their user account.`)) return;
		try {
			const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
			if (error) throw error;
			showNotification('Success', 'Teacher deleted successfully', 'success');
			fetchTeachers();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Teachers - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Teachers</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button color='primary' icon='PersonAdd' onClick={() => router.push('/admin/teachers/create')}>
						Add Teacher
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='School'>
									<CardTitle>Teachers ({filteredTeachers.length})</CardTitle>
								</CardLabel>
								<div className='col-md-4'>
									<Input
										type='search'
										placeholder='Search by name, employee ID, or email...'
										value={searchTerm}
										onChange={(e: any) => setSearchTerm(e.target.value)}
									/>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredTeachers.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm ? 'No teachers found matching your search' : 'No teachers found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Employee ID</th>
												<th>Name</th>
												<th>Email</th>
												<th>Phone</th>
												<th>Subjects</th>
												<th>Joining Date</th>
												<th>Status</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{filteredTeachers.map((teacher) => (
												<tr key={teacher.id}>
													<td>
														<div className='fw-bold'>{teacher.employee_id}</div>
													</td>
													<td>
														<div className='fw-bold'>{teacher.user.full_name}</div>
													</td>
													<td>{teacher.user.email}</td>
													<td>{teacher.user.phone || '-'}</td>
													<td>
														<div style={{ maxWidth: '200px' }}>
															{teacher.subjects && teacher.subjects.length > 0 ? (
																teacher.subjects.map((subject, idx) => (
																	<span key={idx} className='badge bg-info me-1 mb-1'>
																		{subject}
																	</span>
																))
															) : (
																<span className='text-muted'>No subjects</span>
															)}
														</div>
													</td>
													<td>{new Date(teacher.joining_date).toLocaleDateString()}</td>
													<td>
														{teacher.user.is_active ? (
															<span className='badge bg-success'>Active</span>
														) : (
															<span className='badge bg-danger'>Inactive</span>
														)}
													</td>
													<td className='text-end'>
														<Button
															icon='Visibility'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => router.push(`/admin/teachers/${teacher.id}`)}>
															View
														</Button>
														<Button
															icon={teacher.user.is_active ? 'Block' : 'CheckCircle'}
															color={teacher.user.is_active ? 'warning' : 'success'}
															isLight
															size='sm'
															className='me-2'
															onClick={() =>
																handleToggleStatus(
																	teacher.id,
																	teacher.user.email,
																	teacher.user.is_active
																)
															}>
															{teacher.user.is_active ? 'Deactivate' : 'Activate'}
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(teacher.id, teacher.user.full_name)}>
															Delete
														</Button>
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
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default AdminTeachersPage;

