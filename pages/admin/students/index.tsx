/**
 * Admin - Students List & Management
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
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
	date_of_birth: string;
	gender: string | null;
	enrollment_date: string;
	class: {
		name: string;
		grade_level: string;
	} | null;
	parent: {
		full_name: string;
		phone: string;
	};
}

interface Class {
	id: string;
	name: string;
	grade_level: string;
}

const AdminStudentsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [classFilter, setClassFilter] = useState('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch classes
	useEffect(() => {
		const fetchClasses = async () => {
			try {
				const { data, error } = await supabase
					.from('classes')
					.select('id, name, grade_level')
					.order('name');

				if (error) throw error;
				setClasses(data || []);
			} catch (error) {
				console.error('Error fetching classes:', error);
			}
		};
		if (user) fetchClasses();
	}, [user]);

	// Fetch students
	const fetchStudents = async () => {
		try {
			const { data, error } = await supabase
				.from('students')
				.select(`
					id,
					full_name,
					admission_number,
					date_of_birth,
					gender,
					enrollment_date,
					class:classes(name, grade_level),
					parent:profiles!students_parent_id_fkey(full_name, phone)
				`)
				.order('full_name');

			if (error) throw error;
			setStudents(data || []);
		} catch (error) {
			console.error('Error fetching students:', error);
			showNotification('Error', 'Failed to load students', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchStudents();
	}, [user]);

	// Filter students
	const filteredStudents = students.filter((student) => {
		const matchesSearch =
			student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
			student.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesClass =
			classFilter === 'all' || student.class?.name === classFilter;
		return matchesSearch && matchesClass;
	});

	const handleDelete = async (id: string, studentName: string) => {
		if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) return;
		try {
			const { error } = await supabase.from('students').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Student deleted successfully', 'success');
			fetchStudents();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

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

	return (
		<PageWrapper>
			<Head>
				<title>Manage Students - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Students</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button color='primary' icon='PersonAdd' onClick={() => router.push('/admin/students/create')}>
						Add Student
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='People'>
									<CardTitle>Students ({filteredStudents.length})</CardTitle>
								</CardLabel>
								<div className='d-flex gap-3'>
									<div className='col-md-4'>
										<Input
											type='search'
											placeholder='Search by name, admission no, or parent...'
											value={searchTerm}
											onChange={(e: any) => setSearchTerm(e.target.value)}
										/>
									</div>
									<div className='col-md-2'>
										<Select
											value={classFilter}
											onChange={(e: any) => setClassFilter(e.target.value)}
											ariaLabel='Filter by class'>
											<option value='all'>All Classes</option>
											{classes.map((cls) => (
												<option key={cls.id} value={cls.name}>
													{cls.name}
												</option>
											))}
										</Select>
									</div>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredStudents.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm || classFilter !== 'all'
											? 'No students found matching your filters'
											: 'No students found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Admission No</th>
												<th>Student Name</th>
												<th>Class</th>
												<th>Age</th>
												<th>Gender</th>
												<th>Parent</th>
												<th>Enrollment Date</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{filteredStudents.map((student) => (
												<tr key={student.id}>
													<td>
														<div className='fw-bold'>{student.admission_number}</div>
													</td>
													<td>
														<div className='fw-bold'>{student.full_name}</div>
													</td>
													<td>
														{student.class ? (
															<>
																{student.class.name}
																<br />
																<small className='text-muted'>{student.class.grade_level}</small>
															</>
														) : (
															<span className='text-muted'>Not Assigned</span>
														)}
													</td>
													<td>{calculateAge(student.date_of_birth)} years</td>
													<td>{student.gender || '-'}</td>
													<td>
														<div>{student.parent.full_name}</div>
														<small className='text-muted'>{student.parent.phone}</small>
													</td>
													<td>{new Date(student.enrollment_date).toLocaleDateString()}</td>
													<td className='text-end'>
														<Button
															icon='Visibility'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => router.push(`/admin/students/${student.id}`)}>
															View
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(student.id, student.full_name)}>
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

export default AdminStudentsPage;

