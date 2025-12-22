/**
 * Teacher - Grades Entry & Management
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface Grade {
	id: string;
	marks_obtained: number;
	student: {
		id: string;
		full_name: string;
		admission_number: string;
	};
	assessment: {
		id: string;
		name: string;
		max_marks: number;
	};
	subject: {
		id: string;
		name: string;
		code: string;
	};
}

interface Assessment {
	id: string;
	name: string;
	max_marks: number;
}

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
}

interface Subject {
	id: string;
	name: string;
	code: string;
}

const TeacherGradesPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [grades, setGrades] = useState<Grade[]>([]);
	const [assessments, setAssessments] = useState<Assessment[]>([]);
	const [students, setStudents] = useState<Student[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [assessmentFilter, setAssessmentFilter] = useState('all');
	const [showModal, setShowModal] = useState(false);
	const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch assessments
	useEffect(() => {
		const fetchAssessments = async () => {
			try {
				const { data, error } = await supabase
					.from('assessments')
					.select('id, name, max_marks')
					.order('name');

				if (error) throw error;
				setAssessments(data || []);
			} catch (error) {
				console.error('Error fetching assessments:', error);
			}
		};
		if (user) fetchAssessments();
	}, [user]);

	// Fetch students
	useEffect(() => {
		const fetchStudents = async () => {
			try {
				const { data, error } = await supabase
					.from('students')
					.select('id, full_name, admission_number')
					.order('full_name');

				if (error) throw error;
				setStudents(data || []);
			} catch (error) {
				console.error('Error fetching students:', error);
			}
		};
		if (user) fetchStudents();
	}, [user]);

	// Fetch subjects
	useEffect(() => {
		const fetchSubjects = async () => {
			try {
				const { data, error } = await supabase
					.from('subjects')
					.select('id, name, code')
					.order('name');

				if (error) throw error;
				setSubjects(data || []);
			} catch (error) {
				console.error('Error fetching subjects:', error);
			}
		};
		if (user) fetchSubjects();
	}, [user]);

	// Fetch grades
	const fetchGrades = async () => {
		try {
			const { data, error } = await supabase
				.from('grades')
				.select(`
					id,
					marks_obtained,
					student:students(id, full_name, admission_number),
					assessment:assessments(id, name, max_marks),
					subject:subjects(id, name, code)
				`)
				.order('created_at', { ascending: false });

			if (error) throw error;
			setGrades(data || []);
		} catch (error) {
			console.error('Error fetching grades:', error);
			showNotification('Error', 'Failed to load grades', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchGrades();
	}, [user]);

	// Filter grades
	const filteredGrades = grades.filter((grade) => {
		const matchesSearch =
			grade.student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			grade.student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesAssessment =
			assessmentFilter === 'all' || grade.assessment.name === assessmentFilter;
		return matchesSearch && matchesAssessment;
	});

	const formik = useFormik({
		initialValues: {
			student_id: '',
			assessment_id: '',
			subject_id: '',
			marks_obtained: '',
		},
		onSubmit: async (values) => {
			try {
				if (editingGrade) {
					const { error } = await supabase
						.from('grades')
						.update({ marks_obtained: parseFloat(values.marks_obtained) })
						.eq('id', editingGrade.id);
					if (error) throw error;
					showNotification('Success', 'Grade updated successfully', 'success');
				} else {
					const { error } = await supabase.from('grades').insert([
						{
							student_id: values.student_id,
							assessment_id: values.assessment_id,
							subject_id: values.subject_id,
							marks_obtained: parseFloat(values.marks_obtained),
						},
					]);
					if (error) throw error;
					showNotification('Success', 'Grade added successfully', 'success');
				}
				setShowModal(false);
				setEditingGrade(null);
				formik.resetForm();
				fetchGrades();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (grade: Grade) => {
		setEditingGrade(grade);
		formik.setValues({
			student_id: grade.student.id,
			assessment_id: grade.assessment.id,
			subject_id: grade.subject.id,
			marks_obtained: grade.marks_obtained.toString(),
		});
		setShowModal(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this grade?')) return;
		try {
			const { error } = await supabase.from('grades').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Grade deleted successfully', 'success');
			fetchGrades();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleAddNew = () => {
		setEditingGrade(null);
		formik.resetForm();
		setShowModal(true);
	};

	if (loading || !user || role !== UserRole.TEACHER) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Grades Entry - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Grades Entry</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Grade'>
									<CardTitle>Grades ({filteredGrades.length})</CardTitle>
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
									<div className='col-md-3'>
										<Select
											value={assessmentFilter}
											onChange={(e: any) => setAssessmentFilter(e.target.value)}
											ariaLabel='Filter by assessment'>
											<option value='all'>All Assessments</option>
											{assessments.map((assessment) => (
												<option key={assessment.id} value={assessment.name}>
													{assessment.name}
												</option>
											))}
										</Select>
									</div>
									<Button color='primary' icon='Add' onClick={handleAddNew}>
										Add Grade
									</Button>
								</div>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : filteredGrades.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										{searchTerm || assessmentFilter !== 'all'
											? 'No grades found matching your filters'
											: 'No grades found'}
									</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Student</th>
												<th>Assessment</th>
												<th>Subject</th>
												<th>Marks</th>
												<th>Percentage</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{filteredGrades.map((grade) => {
												const percentage = (
													(grade.marks_obtained / grade.assessment.max_marks) *
													100
												).toFixed(1);
												return (
													<tr key={grade.id}>
														<td>
															<div className='fw-bold'>{grade.student.full_name}</div>
															<small className='text-muted'>{grade.student.admission_number}</small>
														</td>
														<td>{grade.assessment.name}</td>
														<td>
															{grade.subject.name}
															<br />
															<small className='text-muted'>{grade.subject.code}</small>
														</td>
														<td>
															{grade.marks_obtained} / {grade.assessment.max_marks}
														</td>
														<td>
															<span
																className={`badge ${
																	parseFloat(percentage) >= 75
																		? 'bg-success'
																		: parseFloat(percentage) >= 50
																		? 'bg-warning'
																		: 'bg-danger'
																}`}>
																{percentage}%
															</span>
														</td>
														<td className='text-end'>
															<Button
																icon='Edit'
																color='info'
																isLight
																size='sm'
																className='me-2'
																onClick={() => handleEdit(grade)}>
																Edit
															</Button>
															<Button
																icon='Delete'
																color='danger'
																isLight
																size='sm'
																onClick={() => handleDelete(grade.id)}>
																Delete
															</Button>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								)}
							</CardBody>
						</Card>
					</div>
				</div>

				{/* Add/Edit Modal */}
				<Modal isOpen={showModal} setIsOpen={setShowModal} size='lg'>
					<ModalHeader setIsOpen={setShowModal}>
						<ModalTitle>{editingGrade ? 'Edit Grade' : 'Add New Grade'}</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<form onSubmit={formik.handleSubmit}>
							<div className='row g-4'>
								<div className='col-12'>
									<FormGroup id='student_id' label='Student'>
										<Select
											onChange={formik.handleChange}
											value={formik.values.student_id}
											ariaLabel='Student'
											disabled={!!editingGrade}
											required>
											<option value=''>Select Student</option>
											{students.map((student) => (
												<option key={student.id} value={student.id}>
													{student.full_name} ({student.admission_number})
												</option>
											))}
										</Select>
									</FormGroup>
								</div>
								<div className='col-md-6'>
									<FormGroup id='assessment_id' label='Assessment'>
										<Select
											onChange={formik.handleChange}
											value={formik.values.assessment_id}
											ariaLabel='Assessment'
											disabled={!!editingGrade}
											required>
											<option value=''>Select Assessment</option>
											{assessments.map((assessment) => (
												<option key={assessment.id} value={assessment.id}>
													{assessment.name} (Max: {assessment.max_marks})
												</option>
											))}
										</Select>
									</FormGroup>
								</div>
								<div className='col-md-6'>
									<FormGroup id='subject_id' label='Subject'>
										<Select
											onChange={formik.handleChange}
											value={formik.values.subject_id}
											ariaLabel='Subject'
											disabled={!!editingGrade}
											required>
											<option value=''>Select Subject</option>
											{subjects.map((subject) => (
												<option key={subject.id} value={subject.id}>
													{subject.name} ({subject.code})
												</option>
											))}
										</Select>
									</FormGroup>
								</div>
								<div className='col-12'>
									<FormGroup id='marks_obtained' label='Marks Obtained'>
										<Input
											type='number'
											step='0.01'
											onChange={formik.handleChange}
											value={formik.values.marks_obtained}
											placeholder='Enter marks'
											required
										/>
									</FormGroup>
								</div>
							</div>
						</form>
					</ModalBody>
					<ModalFooter>
						<Button color='secondary' onClick={() => setShowModal(false)}>
							Cancel
						</Button>
						<Button color='primary' onClick={() => formik.handleSubmit()}>
							{editingGrade ? 'Update' : 'Add'} Grade
						</Button>
					</ModalFooter>
				</Modal>
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

export default TeacherGradesPage;

