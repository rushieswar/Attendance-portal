import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Page from '../../../layout/Page/Page';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, TeacherWithProfile, Class, Subject, TeacherClassWithDetails } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Select from '../../../components/bootstrap/forms/Select';
import Checks from '../../../components/bootstrap/forms/Checks';
import showNotification from '../../../components/extras/showNotification';
import Badge from '../../../components/bootstrap/Badge';
import Icon from '../../../components/icon/Icon';

const AssignClassesPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
	const [classes, setClasses] = useState<Class[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [assignments, setAssignments] = useState<TeacherClassWithDetails[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedTeacher, setSelectedTeacher] = useState<string>('');
	const [selectedClass, setSelectedClass] = useState<string>('');
	const [selectedSubject, setSelectedSubject] = useState<string>('');
	const [isClassTeacher, setIsClassTeacher] = useState(false);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch data
	const fetchData = async () => {
		try {
			// Fetch teachers
			const { data: teachersData, error: teachersError } = await supabase
				.from('teachers')
				.select(`
					*,
					profile:profiles(*)
				`)
				.order('created_at', { ascending: false });

			if (teachersError) throw teachersError;
			setTeachers(teachersData || []);

			// Fetch classes
			const { data: classesData, error: classesError } = await supabase
				.from('classes')
				.select('*')
				.order('grade_level', { ascending: true });

			if (classesError) throw classesError;
			setClasses(classesData || []);

			// Fetch subjects
			const { data: subjectsData, error: subjectsError } = await supabase
				.from('subjects')
				.select('*')
				.order('name', { ascending: true });

			if (subjectsError) throw subjectsError;
			setSubjects(subjectsData || []);

			// Fetch existing assignments
			const { data: assignmentsData, error: assignmentsError } = await supabase
				.from('teacher_classes')
				.select(`
					*,
					teacher:teachers(
						*,
						profile:profiles(*)
					),
					class:classes(*),
					subject:subjects(*)
				`)
				.order('created_at', { ascending: false });

			if (assignmentsError) throw assignmentsError;
			setAssignments(assignmentsData || []);
		} catch (error) {
			console.error('Error fetching data:', error);
			showNotification('Error', 'Failed to load data', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchData();
	}, [user]);

	const handleAssign = async () => {
		if (!selectedTeacher || !selectedClass) {
			showNotification('Error', 'Please select teacher and class', 'warning');
			return;
		}

		try {
			const { error } = await supabase.from('teacher_classes').insert([
				{
					teacher_id: selectedTeacher,
					class_id: selectedClass,
					subject_id: selectedSubject || null,
					is_class_teacher: isClassTeacher,
				},
			]);

			if (error) throw error;
			showNotification('Success', 'Class assigned to teacher successfully', 'success');
			setModalOpen(false);
			resetForm();
			fetchData();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleUnassign = async (id: string) => {
		if (!confirm('Are you sure you want to remove this assignment?')) return;

		try {
			const { error } = await supabase.from('teacher_classes').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Assignment removed successfully', 'success');
			fetchData();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const resetForm = () => {
		setSelectedTeacher('');
		setSelectedClass('');
		setSelectedSubject('');
		setIsClassTeacher(false);
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Assign Classes to Teachers - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Assign Classes to Teachers</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							resetForm();
							setModalOpen(true);
						}}>
						Assign Class
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Assignment'>
									<CardTitle>Teacher-Class Assignments</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>
										<div className='spinner-border text-primary' role='status'>
											<span className='visually-hidden'>Loading...</span>
										</div>
									</div>
								) : assignments.length === 0 ? (
									<div className='text-center py-5'>
										<Icon icon='Info' size='3x' color='info' className='mb-3' />
										<h5>No Assignments Yet</h5>
										<p className='text-muted'>Click "Assign Class" to assign classes to teachers</p>
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Teacher</th>
												<th>Employee ID</th>
												<th>Class</th>
												<th>Subject</th>
												<th>Class Teacher</th>
												<th>Assigned Date</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{assignments.map((assignment) => (
												<tr key={assignment.id}>
													<td>
														<div className='fw-bold'>
															{assignment.teacher?.profile?.full_name || 'N/A'}
														</div>
														<div className='text-muted small'>
															{assignment.teacher?.profile?.email || ''}
														</div>
													</td>
													<td>{assignment.teacher?.employee_id || 'N/A'}</td>
													<td>
														<Badge color='info' isLight>
															{assignment.class?.name || 'N/A'}
														</Badge>
													</td>
													<td>
														{assignment.subject?.name ? (
															<Badge color='success' isLight>
																{assignment.subject.name}
															</Badge>
														) : (
															<span className='text-muted'>All Subjects</span>
														)}
													</td>
													<td>
														{assignment.is_class_teacher ? (
															<Badge color='primary'>Yes</Badge>
														) : (
															<span className='text-muted'>No</span>
														)}
													</td>
													<td>
														{new Date(assignment.assigned_at).toLocaleDateString()}
													</td>
													<td className='text-end'>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleUnassign(assignment.id)}>
															Remove
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

			{/* Assignment Modal */}
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='assign-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='assign-modal'>Assign Class to Teacher</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<FormGroup id='teacher' label='Select Teacher' className='mb-3'>
						<Select
							value={selectedTeacher}
							onChange={(e: any) => setSelectedTeacher(e.target.value)}
							required>
							<option value=''>Select Teacher</option>
							{teachers.map((teacher) => (
								<option key={teacher.id} value={teacher.id}>
									{teacher.profile?.full_name} ({teacher.employee_id})
								</option>
							))}
						</Select>
					</FormGroup>

					<FormGroup id='class' label='Select Class' className='mb-3'>
						<Select
							value={selectedClass}
							onChange={(e: any) => setSelectedClass(e.target.value)}
							required>
							<option value=''>Select Class</option>
							{classes.map((classItem) => (
								<option key={classItem.id} value={classItem.id}>
									{classItem.name} - {classItem.grade_level}
									{classItem.section ? ` (${classItem.section})` : ''}
								</option>
							))}
						</Select>
					</FormGroup>

					<FormGroup id='subject' label='Select Subject (Optional)' className='mb-3'>
						<Select
							value={selectedSubject}
							onChange={(e: any) => setSelectedSubject(e.target.value)}>
							<option value=''>All Subjects</option>
							{subjects.map((subject) => (
								<option key={subject.id} value={subject.id}>
									{subject.name}
								</option>
							))}
						</Select>
						<small className='text-muted'>
							Leave empty if teacher handles all subjects for this class
						</small>
					</FormGroup>

					<FormGroup className='mb-3'>
						<Checks
							type='checkbox'
							id='is_class_teacher'
							label='Is Class Teacher?'
							checked={isClassTeacher}
							onChange={(e: any) => setIsClassTeacher(e.target.checked)}
						/>
						<small className='text-muted'>
							Check if this teacher is the primary class teacher
						</small>
					</FormGroup>
				</ModalBody>
				<ModalFooter>
					<Button color='secondary' onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' icon='Save' onClick={handleAssign}>
						Assign Class
					</Button>
				</ModalFooter>
			</Modal>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'menu'])),
	},
});

export default AssignClassesPage;


