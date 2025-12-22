/**
 * Teacher - View Students List
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

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
	date_of_birth: string;
	gender: string | null;
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

const TeacherStudentsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [classFilter, setClassFilter] = useState('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch assigned classes and students
	useEffect(() => {
		const fetchData = async () => {
			if (!user) return;

			try {
				// Get teacher ID
				const { data: teacherData } = await supabase
					.from('teachers')
					.select('id')
					.eq('user_id', user.id)
					.single();

				if (!teacherData) {
					setLoadingData(false);
					return;
				}

				// Get teacher's assigned classes
				const { data: assignedClasses, error: classError } = await supabase
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

				if (classError) throw classError;

				const classList = assignedClasses?.map((ac: any) => ac.classes).filter(Boolean) || [];
				setClasses(classList);

				// Get students only from assigned classes
				const assignedClassIds = classList.map((c: any) => c.id);

				if (assignedClassIds.length === 0) {
					setStudents([]);
					setLoadingData(false);
					return;
				}

				const { data: studentsData, error: studentsError } = await supabase
					.from('students')
					.select(`
						id,
						full_name,
						admission_number,
						date_of_birth,
						gender,
						class:classes(name, grade_level),
						parent:profiles!students_parent_id_fkey(full_name, phone)
					`)
					.in('class_id', assignedClassIds)
					.order('full_name');

				if (studentsError) throw studentsError;
				setStudents(studentsData || []);
			} catch (error) {
				console.error('Error fetching data:', error);
				showNotification('Error', 'Failed to load data', 'danger');
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, [user]);

	// Filter students
	const filteredStudents = students.filter((student) => {
		const matchesSearch =
			student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesClass =
			classFilter === 'all' || student.class?.name === classFilter;
		return matchesSearch && matchesClass;
	});

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

	if (loading || !user || role !== UserRole.TEACHER) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Students List - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Students List</span>
				</SubHeaderLeft>
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
											placeholder='Search by name or admission number...'
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
												<th>Contact</th>
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
													<td>{student.parent.full_name}</td>
													<td>{student.parent.phone}</td>
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

export default TeacherStudentsPage;
