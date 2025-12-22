/**
 * Parent - View Children's Grades
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
import Select from '../../../components/bootstrap/forms/Select';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface Grade {
	id: string;
	marks_obtained: number;
	assessment: {
		name: string;
		max_marks: number;
		assessment_date: string;
	};
	subject: {
		name: string;
		code: string;
	};
}

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
}

const ParentGradesPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [students, setStudents] = useState<Student[]>([]);
	const [grades, setGrades] = useState<Grade[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [selectedStudent, setSelectedStudent] = useState('all');

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.PARENT)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch children
	useEffect(() => {
		const fetchStudents = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('students')
					.select('id, full_name, admission_number')
					.eq('parent_id', user.id)
					.order('full_name');

				if (error) throw error;
				setStudents(data || []);
				if (data && data.length > 0) {
					setSelectedStudent(data[0].id);
				}
			} catch (error) {
				console.error('Error fetching students:', error);
				showNotification('Error', 'Failed to load children', 'danger');
			}
		};
		if (user) fetchStudents();
	}, [user]);

	// Fetch grades for selected student
	useEffect(() => {
		const fetchGrades = async () => {
			if (!selectedStudent || selectedStudent === 'all') {
				setGrades([]);
				setLoadingData(false);
				return;
			}
			try {
				const { data, error } = await supabase
					.from('grades')
					.select(`
						id,
						marks_obtained,
						assessment:assessments(name, max_marks, assessment_date),
						subject:subjects(name, code)
					`)
					.eq('student_id', selectedStudent)
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
		fetchGrades();
	}, [selectedStudent]);

	// Calculate average percentage
	const calculateAverage = () => {
		if (grades.length === 0) return '0';
		const totalPercentage = grades.reduce((sum, grade) => {
			const percentage = (grade.marks_obtained / grade.assessment.max_marks) * 100;
			return sum + percentage;
		}, 0);
		return (totalPercentage / grades.length).toFixed(1);
	};

	// Group grades by subject
	const gradesBySubject = grades.reduce((acc, grade) => {
		const subjectName = grade.subject.name;
		if (!acc[subjectName]) {
			acc[subjectName] = [];
		}
		acc[subjectName].push(grade);
		return acc;
	}, {} as Record<string, Grade[]>);

	if (loading || !user || role !== UserRole.PARENT) return null;

	const averagePercentage = calculateAverage();

	return (
		<PageWrapper>
			<Head>
				<title>Children's Grades - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/parent/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Children's Grades</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row mb-4'>
					<div className='col-md-6'>
						<Card>
							<CardBody>
								<FormGroup id='selectedStudent' label='Select Child'>
									<Select
										value={selectedStudent}
										onChange={(e: any) => setSelectedStudent(e.target.value)}
										ariaLabel='Select Child'>
										<option value='all'>Select a child</option>
										{students.map((student) => (
											<option key={student.id} value={student.id}>
												{student.full_name} ({student.admission_number})
											</option>
										))}
									</Select>
								</FormGroup>
							</CardBody>
						</Card>
					</div>
					<div className='col-md-6'>
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
												className='bi bi-trophy'
												viewBox='0 0 16 16'>
												<path d='M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z' />
											</svg>
										</div>
									</div>
									<div className='flex-grow-1 ms-3'>
										<div className='text-muted small'>Average Score</div>
										<div className='fw-bold h4 mb-0'>{averagePercentage}%</div>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{selectedStudent === 'all' ? (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardBody>
									<div className='text-center py-5 text-muted'>
										Please select a child to view their grades
									</div>
								</CardBody>
							</Card>
						</div>
					</div>
				) : (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardHeader>
									<CardLabel icon='Grade'>
										<CardTitle>Academic Performance</CardTitle>
									</CardLabel>
								</CardHeader>
								<CardBody>
									{loadingData ? (
										<div className='text-center py-5'>Loading...</div>
									) : grades.length === 0 ? (
										<div className='text-center py-5 text-muted'>No grades found</div>
									) : (
										<>
											{Object.entries(gradesBySubject).map(([subjectName, subjectGrades]) => {
												const subjectAverage = (
													subjectGrades.reduce((sum, grade) => {
														const percentage =
															(grade.marks_obtained / grade.assessment.max_marks) * 100;
														return sum + percentage;
													}, 0) / subjectGrades.length
												).toFixed(1);

												return (
													<div key={subjectName} className='mb-4'>
														<div className='d-flex justify-content-between align-items-center mb-3'>
															<h5 className='mb-0'>{subjectName}</h5>
															<span
																className={`badge ${
																	parseFloat(subjectAverage) >= 75
																		? 'bg-success'
																		: parseFloat(subjectAverage) >= 50
																		? 'bg-warning'
																		: 'bg-danger'
																}`}>
																Average: {subjectAverage}%
															</span>
														</div>
														<div className='table-responsive'>
															<table className='table table-modern table-hover'>
																<thead>
																	<tr>
																		<th>Assessment</th>
																		<th>Date</th>
																		<th>Marks</th>
																		<th>Percentage</th>
																	</tr>
																</thead>
																<tbody>
																	{subjectGrades.map((grade) => {
																		const percentage = (
																			(grade.marks_obtained / grade.assessment.max_marks) *
																			100
																		).toFixed(1);
																		return (
																			<tr key={grade.id}>
																				<td>{grade.assessment.name}</td>
																				<td>
																					{grade.assessment.assessment_date
																						? new Date(
																								grade.assessment.assessment_date
																						  ).toLocaleDateString()
																						: '-'}
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
																			</tr>
																		);
																	})}
																</tbody>
															</table>
														</div>
													</div>
												);
											})}
										</>
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

export default ParentGradesPage;
